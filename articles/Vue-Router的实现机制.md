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

下面我们详细看一下confirmTransition内部都执行了哪些逻辑：

未完待续...