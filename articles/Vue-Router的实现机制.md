## 先看怎么用

我们先看项目中是怎么使用Vue Router的：

```
//JS部分
Vue.use(VueRouter)

//定义路由
const routes = [
  { path: '/foo', component: Foo },
  { path: '/bar', component: Bar }
]

//创建router实例
const router = new VueRouter({
  routes 
})

//挂载实例
const app = new Vue({
  router
}).$mount('#app')

//HTML部分
<div id="app">
  <h1>Hello App!</h1>
  <p>
    <!-- 使用 router-link 组件来导航. -->
    <!-- 通过传入 `to` 属性指定链接. -->
    <!-- <router-link> 默认会被渲染成一个 `<a>` 标签 -->
    <router-link to="/foo">Go to Foo</router-link>
    <router-link to="/bar">Go to Bar</router-link>
  </p>
  <!-- 路由出口 -->
  <!-- 路由匹配到的组件将渲染在这里 -->
  <router-view></router-view>
</div>
```

## 为什么这么用

先从JS部分开始，第一句代码是`Vue.use(VueRouter)`，首先你去研究下Vue.use函数是用来干嘛的，这里默认你已经知道了Vue.use是用来执行传入插件的install函数的，此处执行的就是VueRouter的install函数，我们来看下VueRouter的install函数都做了什么，简化版函数如下：

```
function install (Vue) {
  ...
  const registerInstance = (vm, callVal) => {
    let i = vm.$options._parentVnode
    if (isDef(i) && isDef(i = i.data) && isDef(i = i.registerRouteInstance)) {
      i(vm, callVal)
    }
  }

  Vue.mixin({
    beforeCreate () {
      if (isDef(this.$options.router)) {
        this._routerRoot = this
        this._router = this.$options.router
        this._router.init(this)
        Vue.util.defineReactive(this, '_route', this._router.history.current)
      } else {
        this._routerRoot = (this.$parent && this.$parent._routerRoot) || this
      }
      registerInstance(this, this)
    },
    destroyed () {
      registerInstance(this)
    }
  })

  Object.defineProperty(Vue.prototype, '$router', {
    get () { return this._routerRoot._router }
  })

  Object.defineProperty(Vue.prototype, '$route', {
    get () { return this._routerRoot._route }
  })

  Vue.component('RouterView', View)
  Vue.component('RouterLink', Link)

  const strats = Vue.config.optionMergeStrategies
  // use the same hook merging strategy for route hooks
  strats.beforeRouteEnter = strats.beforeRouteLeave = strats.beforeRouteUpdate = strats.created
}
```

Vue.mixin函数的作用是合并创建Vue实例对象时传入的options，此处的作用是影响创建vue实例化过程中的两个周期函数，在beforeCreate的时候，判断如果传入了router属性就初始化这个路由`this._router.init(this)`，那这个初始化又做了什么呢？我们来看下init函数：

```
 init (app: any /* Vue component instance */) {
    ...
    this.app = app
    const history = this.history

    if (history instanceof HTML5History) {
      history.transitionTo(history.getCurrentLocation()) 
    } else if (history instanceof HashHistory) {
      const setupHashListener = () => {
        history.setupListeners()
      }
      history.transitionTo(
        history.getCurrentLocation(),
        setupHashListener,
        setupHashListener
      )
    }

    history.listen(route => {
      this.apps.forEach((app) => {
        app._route = route
      })
    })
  }
```

让我们逐行分析

```
const history = this.history
```

这个history对象是怎么生成的呢？发现VueRouter构造函数中有这样一段代码：

```
let mode = options.mode || 'hash'
switch (mode) {
      case 'history':
        this.history = new HTML5History(this, options.base)
        break
      case 'hash':
        this.history = new HashHistory(this, options.base, this.fallback)
        break
      case 'abstract':
        this.history = new AbstractHistory(this, options.base)
        break
      default:
        if (process.env.NODE_ENV !== 'production') {
          assert(false, `invalid mode: ${mode}`)
        }
    }
```

options是创建vue router实例时传进来的参数，也就说如果不传mode参数，默认应该是hash模式，我们逐个来看，先看case 是'history'的时候，执行的是`this.history = new HTML5History(this, options.base) `，其中的this是路由实例。因为这段代码是定义在Vue Router构造函数中的，所以创建router实例的时候会创建这个history对象。继续看上面的init函数下一段代码：

```
if (history instanceof HTML5History) {
      history.transitionTo(history.getCurrentLocation()) 
 }
```

如果是history模式，就调用history的transitionTo函数，我们先看下传递给transitionTo函数的参数是什么，`history.getCurrentLocation()`，这句话就是获取当前路由的location，这个location是由path、query、hash拼接起来的，比如当前的URL是https://www.test.com/abc?id=1&name=lily#hash，那获取到的location就是/abc?id=1&name=lily#hash。把得到的location传入transitionTo函数中，我们详细看下transitionTo都做了什么：

```
//transitionTo定义在源码的/src/history/base.js中，说明这个函数是hash模式或者history模式路由的公用函数
  transitionTo (location: RawLocation, onComplete?: Function, onAbort?: Function) {
    const route = this.router.match(location, this.current) 
    this.confirmTransition(route, () => {
      this.updateRoute(route)
      onComplete && onComplete(route)
      this.ensureURL()

      // fire ready cbs once
      if (!this.ready) {
        this.ready = true
        this.readyCbs.forEach(cb => { cb(route) })
      }
    }, err => {
      if (onAbort) {
        onAbort(err)
      }
      if (err && !this.ready) {
        this.ready = true
        this.readyErrorCbs.forEach(cb => { cb(err) })
      }
    })
  }
```

由`history.transitionTo(history.getCurrentLocation()) `可知初始化的时候只传递了一个location参数，我们先看transitionTo函数中的第一句`this.router.match(location, this.current) `，其中location我们已经知道是什么了，那么this.current是什么呢？在History构造函数中有这样一句`this.current = START`，我们看下START的值是多少

```
//START定义在/src/util/route.js中
export const START = createRoute(null, {
  path: '/'
})

//createRoute函数的作用是用来创建route配置对象
function createRoute (
  record: ?RouteRecord,
  location: Location,
  redirectedFrom?: ?Location,
  router?: VueRouter
): Route {//初始状态下record是null，location对象是{path: '/'}
  ...
  const route: Route = {//填充route配置
    name: location.name || (record && record.name),
    meta: (record && record.meta) || {},
    path: location.path || '/',
    hash: location.hash || '',
    query,
    params: location.params || {},
    fullPath: getFullPath(location, stringifyQuery), 
    matched: record ? formatMatch(record) : []
  }
  ...
  return Object.freeze(route) 
}
```

由上面的代码可知，START是一个初始的route对象，`this.current = START`，因此this.current也是一个路由对象，如下所示：

```
this.current = {
    name: null,
    meta: {},
    path: '/',
    hash: '',
    query: {},
    params: {},
    fullPath: '/',
    matched: []
  }
```

知道了location和this.current是什么了，我们继续看transitionTo中的这句代码`this.router.match(location, this.current) `，看下路由实例的match函数是怎样定义的：

```
match (
    raw: RawLocation,
    current?: Route,
    ...
  ): Route {
    return this.matcher.match(raw, current)
  }
```

可以看到，继续追踪this.matcher.match，看到`this.matcher = createMatcher(options.routes || [], this) `，参数是routes路由配置和vue-router实例，这句代码也是在VueRouter构造函数中定义的，说明创建router实例的时候，还会创建一个matcher匹配器。

接下来看createMatcher函数都做了什么?createMatcher会返回一个对象，对象中有个match属性，属性值就是match函数，match函数的作用就是遍历routes数组的配置，看当前的location是否有能匹配到的路由，并且返回一个新创建的路由配置对象。比如location是/abc?id=1&name=lily#hash，如果能匹配到，就会返回一个routes配置对象。

我们继续回到transitionTo函数中，看下一段代码：

```
this.confirmTransition(route, () => {
      this.updateRoute(route)
      onComplete && onComplete(route)
      this.ensureURL()

      // fire ready cbs once
      if (!this.ready) {
        this.ready = true
        this.readyCbs.forEach(cb => { cb(route) })
      }
    }, err => {
      if (onAbort) {
        onAbort(err)
      }
      if (err && !this.ready) {
        this.ready = true
        this.readyErrorCbs.forEach(cb => { cb(err) })
      }
    })
```

传入confirmTransition中的第一个参数就是上面创建出来的路由配置对象，第二个和第三个参数是两个回调函数，第二个是onComplete，第三个是onAbort，顾名思义，分别是路由跳转完成时要执行的回调和跳转过程中终止时要执行的回调。总的来说，就是transition结束更新，transition终止执行错误处理。

下面我们详细看一下confirmTransition内部都执行了哪些逻辑，我们逐段来分析：

```
confirmTransition (route: Route, onComplete: Function, onAbort?: Function) {
    ...
    //如果要跳转的路由和当前路由一致的话，就终止跳转
    if (
      isSameRoute(route, current) &&
      route.matched.length === current.matched.length
    ) {
      this.ensureURL()
      return abort()
    }

    const {
      updated,
      deactivated,
      activated
    } = resolveQueue(this.current.matched, route.matched)

    const queue: Array<?NavigationGuard> = [].concat(
      // in-component leave guards
      extractLeaveGuards(deactivated),
      // global before hooks
      this.router.beforeHooks,
      // in-component update hooks
      extractUpdateHooks(updated),
      // in-config enter guards
      activated.map(m => m.beforeEnter),
      // async components
      resolveAsyncComponents(activated)
    )

    this.pending = route
    const iterator = (hook: NavigationGuard, next) => {
      if (this.pending !== route) {
        return abort()
      }
      try {
        hook(route, current, (to: any) => {
          if (to === false || isError(to)) {
            // next(false) -> abort navigation, ensure current URL
            this.ensureURL(true)
            abort(to)
          } else if (
            typeof to === 'string' ||
            (typeof to === 'object' && (
              typeof to.path === 'string' ||
              typeof to.name === 'string'
            ))
          ) {
            // next('/') or next({ path: '/' }) -> redirect
            abort()
            if (typeof to === 'object' && to.replace) {
              this.replace(to)
            } else {
              this.push(to)
            }
          } else {
            // confirm transition and pass on the value
            next(to)
          }
        })
      } catch (e) {
        abort(e)
      }
    }

    runQueue(queue, iterator, () => {
      const postEnterCbs = []
      const isValid = () => this.current === route
      // wait until async components are resolved before
      // extracting in-component enter guards
      const enterGuards = extractEnterGuards(activated, postEnterCbs, isValid)
      const queue = enterGuards.concat(this.router.resolveHooks)
      runQueue(queue, iterator, () => {
        if (this.pending !== route) {
          return abort()
        }
        this.pending = null
        onComplete(route)
        if (this.router.app) {
          this.router.app.$nextTick(() => {
            postEnterCbs.forEach(cb => { cb() })
          })
        }
      })
    })
  }
```

在history模式中ensureURL的实现如下：

```
ensureURL (push?: boolean) {
    if (getLocation(this.base) !== this.current.fullPath) {
      const current = cleanPath(this.base + this.current.fullPath)
      push ? pushState(current) : replaceState(current)
    }
  }
```

ensureURL函数的作用是确保浏览器上的URL始终是正确的。

接下来的一段代码是：

```
const {
      updated,
      deactivated,
      activated
    } = resolveQueue(this.current.matched, route.matched)
```

这三个变量分别表示要更新的，要摧毁的，要激活的。比如this.current.matched数组中放着[recordA、recordB、recordC、recordD]，route.matched数组中放着[recordA、recordB、recordD、recordF]，两个数组经过resolveQueue函数的处理，得出的updated就是数组[recordA，recordB]，activated就是[recordD, recordF]，deactivated就是数组[recordC, recordD]，可以看出updated就是当前匹配路由中和即将跳转的匹配路由中相同的部分，activated就是即将跳转的路由中新的部分，deactivated就是新路由中不存在的路由，也就是即将被废弃的路由。

接着看下段代码，定义了一个队列，队列中都包含什么内容呢？

```
const queue: Array<?NavigationGuard> = [].concat(
      // in-component leave guards
      extractLeaveGuards(deactivated),
      // global before hooks
      this.router.beforeHooks,
      // in-component update hooks
      extractUpdateHooks(updated),
      // in-config enter guards
      activated.map(m => m.beforeEnter),
      // async components
      resolveAsyncComponents(activated)
    )
```

先看`extractLeaveGuards(deactivated)`，源码中这句话的执行就等于执行了`extractGuards(deactivated, 'beforeRouteLeave', bindGuard, true)`，那看下extractGuards的定义：

```
function extractGuards (
  records: Array<RouteRecord>,
  name: string,
  bind: Function,
  reverse?: boolean
): Array<?Function> {
  const guards = flatMapComponents(records, (def, instance, match, key) => {
    const guard = extractGuard(def, name)
    if (guard) {
      return Array.isArray(guard)
        ? guard.map(guard => bind(guard, instance, match, key))
        : bind(guard, instance, match, key)
    }
  })
  return flatten(reverse ? guards.reverse() : guards)
}
```

flatMapComponents的作用是返回一个数组

```
//返回一个数组[fn(Foo, instances, record, 'a'), fn()...]
export function flatMapComponents (
  matched: Array<RouteRecord>,
  fn: Function
): Array<?Function> {

  // components: {
  //   default: Foo,
  //   a: Bar,
  //   b: Baz
  // }

  return flatten(matched.map(m => {
    return Object.keys(m.components).map(key => fn(
      m.components[key], //组件
      m.instances[key], //instances对应的value
      m, key //m是对象，key是组件属性
    ))
  }))
}

export function flatten (arr: Array<any>): Array<any> {
  return Array.prototype.concat.apply([], arr)
}
```

数组中的每个元素都是fn执行完的结果，那么对于extractGuards函数中的guards执行结果是什么呢？我们逐步分析如下代码：

```
const guards = flatMapComponents(records, (def, instance, match, key) => {
    //此处def指对应当前路由配置的组件，name是beforeRouteLeave
    const guard = extractGuard(def, name) //extractGuard函数的作用是提取出路由导航守卫函数
    if (guard) {
      return Array.isArray(guard)
        ? guard.map(guard => bind(guard, instance, match, key))
        : bind(guard, instance, match, key) //bind函数的作用是把导航守卫函数绑定在instance实例上
    }
  })
  return flatten(reverse ? guards.reverse() : guards) //返回提取出的guards数组
```

由此可知extractLeaveGuards(deactivated)的作用是提取出要销毁的路由的beforeRouteLeave事件函数，再回到上上面confirmTransition函数的queue定义中：

```
const queue: Array<?NavigationGuard> = [].concat(
      // in-component leave guards
      extractLeaveGuards(deactivated),
      // global before hooks
      this.router.beforeHooks,
      // in-component update hooks
      extractUpdateHooks(updated),
      // in-config enter guards
      activated.map(m => m.beforeEnter),
      // async components
      resolveAsyncComponents(activated)
    )
```

继续看第二个参数this.router.beforeHooks，beforeHooks数组中存放的都是通过beforeEach钩子函数注入的函数，这些函数的全局的。

继续看第三个参数extractUpdateHooks(updated)，类似于extractLeaveGuards(deactivated)的逻辑，提取出各个组件中的beforeRouteUpdate事件函数，放入一个数组中。

第四个参数是`activated.map(m => m.beforeEnter)`，把即将要跳转的路由配置中的beforeEnter钩子函数放入一个数组中。

最后一个参数resolveAsyncComponents(activated)，把用来解析异步组件的函数存入数组中。

这么看来，queue数组中依次存放着路由的导航解析流程。

接下来再看confirmTransition函数中iterator的定义：

```
const iterator = (hook: NavigationGuard, next) => {
      if (this.pending !== route) {
        return abort()
      }
      try {
        hook(route, current, (to: any) => {
          if (to === false || isError(to)) {
            // next(false) -> abort navigation, ensure current URL
            this.ensureURL(true)
            abort(to)
          } else if (
            typeof to === 'string' ||
            (typeof to === 'object' && (
              typeof to.path === 'string' ||
              typeof to.name === 'string'
            ))
          ) {
            // next('/') or next({ path: '/' }) -> redirect
            abort()
            if (typeof to === 'object' && to.replace) {
              this.replace(to)
            } else {
              this.push(to)
            }
          } else {
            // confirm transition and pass on the value
            next(to)
          }
        })
      } catch (e) {
        abort(e)
      }
    }
```

iterator是个函数，其中的参数hook就是各个导航守卫函数，比如beforeRouteLeave、beforeRouteUpdate等，调用iterator就会执行这些导航守卫函数。

接下来的runQueue函数核心就是用来依次执行queue中的hook函数。

至此confirmTransition函数就分析完毕了，transitionTo函数也分析完毕。

再回到init函数中，可知初始化过程中，如果是history模式的路由，就把各种路由hook注入其中。接下来init函数中执行的是：

```
history.listen(route => {
      this.apps.forEach((app) => {
        app._route = route
      })
    })
```

history.listen函数中传入了一个回调函数，回调函数中的this.apps是指存放vue实例的数组，有可能在多个vue文件使用Vue.use(VueRouter)，那this.apps中就会保存多个vue实例，遍历这个数组，给每一个vue实例添加一个_route属性，属性值是路由配置对象。

这个回调函数在更新路由的时候会被调用，我们看下是路由更新函数：

```
  updateRoute (route: Route) {
    const prev = this.current
    this.current = route
    this.cb && this.cb(route)
    this.router.afterHooks.forEach(hook => {
      hook && hook(route, prev)
    })
  }
```

更新路由的时候，会用匹配到的新路由对象替换vue实例上_route属性的旧值，并执行路由配置中的所有afterEach钩子函数，至此完整的路由init函数逻辑就分析完毕。

继续回退到install函数中，下面一句代码是`Vue.util.defineReactive(this, '_route', this._router.history.current)`，这句代码的作用是给vue实例添加一个响应式属性_route。

接下来是`registerInstance(this, this)`，其中的this是指vue组件实例，看下这个函数是如何定义的

```
  const registerInstance = (vm, callVal) => {
    let i = vm.$options._parentVnode//缓存vm中的_parentVnode属性值
    if (isDef(i) && isDef(i = i.data) && isDef(i = i.registerRouteInstance)) {
      i(vm, callVal) //执行registerRouteInstance函数
    }
  }
```

registerRouteInstance是在路由组件view中定义的，看下代码：

```
data.registerRouteInstance = (vm, val) => {
      const current = matched.instances[name]
      if (
        (val && current !== vm) ||
        (!val && current === vm)
      ) {
        matched.instances[name] = val
      }
    }
```

目前还不知道注册这个实例有什么作用，我们先跳过这段，install函数中的Vue.mixin就分析完毕了，接下来执行的是：

```
Object.defineProperty(Vue.prototype, '$router', {
    get () { return this._routerRoot._router }
  })

  Object.defineProperty(Vue.prototype, '$route', {
    get () { return this._routerRoot._route }
  })

  Vue.component('RouterView', View)
  Vue.component('RouterLink', Link)
```

给vue的原型对象上定义两个属性`$router`、`$route`，还注册了两个全局组件RouterView和RouterLink。

我们来总结下整体流程:

1. 执行Vue.use(VueRouter)，会扩展vue初始化过程中的两个周期函数beforeCreate和destroyed
2. 在beforeCreate中初始化路由，注册各个路由钩子函数
3. 注册两个全局组件view和link

相当于万事俱备，只等路由的触发了。