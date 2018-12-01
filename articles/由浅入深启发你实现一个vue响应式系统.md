先看下vue是怎么用的

```
<template>
	<div>{{name}}</div>
</template>
		
new Vue({
  el: '#app',
  data: {
  	name: 'lily'
  },
  methods: {
    changeName() {
    	this.name = 'susan'
    }
  }
})
```

## 由浅入深

先不考虑各种边界情况，我们实现一个最简单的Vue响应式系统。首先要有一个`$watch`函数，监测data中的属性，当属性值有改变时，就重新渲染。

```
$watch('name', () => {
  console.log('属性name被修改了')
})
```

思考如何知道属性值改变了呢？有没有一种方法能够在属性值改变的那一刻执行一些逻辑呢？有，用Object.defineProperty定义属性的set函数，在属性被改变的时候去通知监测器；那么什么时候收集这些监测器呢？可以在执行属性的get函数时，思路有了，来把它实现。

```
let deps = [] //用于收集订阅器监听到属性值改变后，要执行的回调函数
Object.defineProperty(data, 'name', {
  get: function() {
    deps.push(fn)
  },
  set: function() {
    deps.forEach(fn => {
      fn()
    })
  }
})
```

雏形有了，继续思考这个fn要如何获取到呢？把它做成全局变量就可以了，当调用`$watch`的时候把回调赋值给这个全局变量，然后获取属性值，触发get函数把fn push进deps中，把deps看作一个筐子，每生成一个订阅器，也就是调用`$watch`的时候就把这个订阅器扔到筐子里，这样等这些订阅器订阅的属性值变化时，这个筐子里的订阅器就能批量被处理了。

```
let Target = null
function $watch (key, fn) {
		Target = fn
		data[key] //触发get函数
}

let deps = [] 
Object.defineProperty(data, 'name', {
  get: function() {
    deps.push(Target)
  },
  set: function() {
    deps.forEach(fn => {
      fn()
    })
  }
})
```

我们调用函数`$watch`，然后修改属性name的值看下结果：

```
$watch('name', () => {
  console.log('属性name被修改了')
})
data.name = 'susan' //控制台打印出属性name被修改了
```

如果你在控制台执行data.name会发现获取到的是undefined，为什么？因为我们的get函数中并没有返回值，而且在set的时候也没有更新值，我们继续改进上面的代码：

```
let val = data['name'] //缓存属性值
Object.defineProperty(data, 'name', {
  get: function() {
    deps.push(Target)
    return val
  },
  set: function(newVal) {
  	if (newVal !== val) {
  		val = newVal
      deps.forEach(fn => {
        fn()
      })
  	}
  }
})
```

到这里，我们就实现了一个简易版的属性监听功能，但是上面的代码只有一个属性，如果data中有多个属性呢？继续丰富代码：

```
var keys = Object.keys(data)
keys.forEach((key) => {
  let deps = []
  let val = data[key]
  Object.defineProperty(data, key, {
    set: function (newVal) {
      if (newVal !=== val) {
        val = newVal
        deps.forEach(fn => {
          fn()
        })
      }
    },
    get: function () {
      if (Target) {
        deps.push(Target)
      }
      return val
    }
	})
})
```

我们把收集器的逻辑抽离出来，也就是那个框，把它抽离成一个构造函数。

```
function Dep () {
  this.deps = []
  this.addSub = function (sub) {
 		this.deps.push(sub)
  }
  this.notify = function () {
    this.deps.forEach((dep) => {
    dep()
    })
  }
}
```

用这个构造函数替换set和get函数中的逻辑

```
var keys = Object.keys(data)
keys.forEach((key) => {
  let dep = new Dep()
  let val = data[key]
  Object.defineProperty(data, key, {
    set: function (newVal) {
      if (newVal !=== val) {
        val = newVal
        dep.notify()
      }
    },
    get: function () {
      if (Target) {
        dep.addSub(Target)
      }
      return val
    }
	})
})
```

这样代码看起来清爽很多。不过我们做的还不够，继续思考，如果data对象是个嵌套的结构，如何去监听data中的嵌套属性呢？比如：

```
const data = {
  a: {
    b: 1
  }
}
```

如何把data.a.b也变成响应式属性呢？用递归就行：

```
function walk(data) {
  var keys = Object.keys(data)
  keys.forEach((key) => {
  	defineReactive(data, key)
  })
}
		
function defineReactive(data, key) {
  let val = data[key]
  if (Object.prototype.toString.call(val) === '[object Object]') {
  	walk(val) //如果属性值是对象的话，递归绑定get，set函数
  }
  const dep = new Dep()
  Object.defineProperty(data, key, {
    set: function (newVal) {
      if (newVal === val) {
      return
      }
      val = newVal
      dep.notify()
    },
    get: function () {
      if (Target) {
      dep.addSub(Target)
      }
      return val
    }
  })
}
```

递归调用我们写好了之后，发现调用`$watch`函数无效了，因为watch函数中的data[key]此时变成了data[a.b]，这样调用肯定是不对的，那么怎么处理成`data[a][b]`呢？我们用正则来处理下watch函数：

```
function $watch (key, fn) {
  Target = fn
  if (/\./.test(key)) {
    const arr = key.split('.')
    let obj = data
    arr.forEach(item => {
    	obj = obj[item]
    })
  } else {
    data[key]
  }
}
```

此时再修改data.a.b的值，就可以看到控制台打印出属性被修改了。

前面我们讲的传入给watch的参数是字符串，进一步思考下，可不可以给watch传入一个函数呢？这个函数的调用访问了data属性，这种场景在Vue中很常见，模板中经常会用模板语法访问对象属性，比如：

```
<div>{{data.name}}</div>
```

我们写一个render函数的例子：

```
const data = {
  name: 'lily',
  age: 18
}

function render () {
	return document.write(`姓名：${data.name}，年龄：${data.age}`)
}

$watch(render, fn)
```

为了执行render函数，我们必须优化`$watch函数`，加上参数是否是函数的判断逻辑：

```
function $watch (expOrFn, fn) {
			Target = fn
			if (typeof expOrFn === 'function') {
				expOrFn()
				return
			}
			if (/\./.test(expOrFn)) {
				const arr = expOrFn.split('.')
				let obj = data
				arr.forEach(item => {
					obj = obj[item]
				})
			} else {
				data[expOrFn]
			}
    }
```

再次调用改进后的`$watch函数`，执行`$watch(render, render)`，为什么第二个参数传递的还是render呢？因为第一个参数用来收集依赖，当属性值改变后，就执行render函数重新渲染视图，这也是Vue响应式系统的实现思路。

我们进一步思考，上面的data对象中如果属性值是数组的话，会和对象是一样的处理方法吗？也是用set和get吗？显然是不行的。

```
const data = {
  lists: [1, 2, 3] 
}
```

数组实例自带很多原型方法会改变数组本身的值，比如：`push`、`pop`、`shift`、`unshift`、`splice`、`sort` 以及 `reverse` 等。那开发者很可能会使用到这些方法，我们就需要监听这些方法，在触发的时候更新依赖，那么如何触发呢？思考一下，比如有个数组实例`a = [1, 2, 3]`，`a.__proto__ == Array.prototype`，`Array.prototype`这个对象中包含的都是数组的方法，因此我们可以这样实现：

```
var arrMethodsObj = Object.create(Array.prototype) 
a.__proto__ = arrMethodsObj
```

因此我们可以在a的`__proto__`指向的对象`arrMethodsObj`中重写`push、pop`等方法，而这个`arrMethodsObj`对象的`__proto__`指向的又是数组的原型对象，以push为例看`arrMethodsObj`如何实现。

```
arrMethodsObj.push = function () {
      const ret = Array.prototype.push.call(this, arguments)
      dep.notify()
      return ret
    }
```

可以封装一个方法来处理这几个数组方法。

不过真实的响应系统，还有很多细节需要处理，我们思考一下，如果上面的render函数是这样写的

```
function render () {
	return document.write(`姓名：${data.name}，昵称：${data.name}，年龄：${data.age}`)
}
```

有两个data.name，会触发两次get拦截器属性，会在这一个渲染器watcher中重复收集两次data.name的依赖，那么我们思考一下如何避免在一次计算中重复收集依赖呢？

watcher和dep的关系大概如此：

1.在初始化的时候，会创建一个渲染函数watcher，除了这个watcher，还会有计算属性watcher等其他的watcher。

2.每个wacther中可能会触发多个data对象属性的get函数，比如上面的render watcher中有data.name和data.age，这两个data属性的get拦截器函数都被触发了，每个watcher中会有deps属性用来存放所有的收集筐。

3.每个data属性的get拦截器函数都会创建一个自己的dep实例对象，用于收集watcher，比如1号筐子dep1是data.name的筐子，渲染函数watcher中用到了data.name，计算属性watcher中用到了this.name，都触发了name的get函数，那么dep1中就收集了两个watcher。

我们以渲染函数watcher为例，来说明是如何收集依赖，以及如何避免收集重复依赖的。看简易版的Watcher这个构造函数：

```
 export default class Watcher {
      constructor (
        vm: Component,
        expOrFn: string | Function,
        cb: Function,
      ) {
        this.deps = []
        this.newDeps = []
        this.depIds = new Set()
        this.newDepIds = new Set()
        this.value = this.get()
      }

      get () {
        pushTarget(this)
        let value
        const vm = this.vm
        value = this.getter.call(vm, vm) //这一行代码就是用来求值，触发各个属性的get拦截器函数
        popTarget()
        this.cleanupDeps() 
        return value
      }

      addDep (dep: Dep) {
        const id = dep.id
        if (!this.newDepIds.has(id)) {
          this.newDepIds.add(id)
          this.newDeps.push(dep)
          if (!this.depIds.has(id)) {
            dep.addSub(this)
          }
        }
      }

      cleanupDeps () {
        let i = this.deps.length
        while (i--) {
          const dep = this.deps[i]
          if (!this.newDepIds.has(dep.id)) {
            dep.removeSub(this)
          }
        } 
        let tmp = this.depIds
        this.depIds = this.newDepIds
        this.newDepIds = tmp 
        this.newDepIds.clear()
        tmp = this.deps
        this.deps = this.newDeps
        this.newDeps = tmp 
        this.newDeps.length = 0
      }
    }
```

我们来捋一下逻辑执行顺序：

1.初始化watcher，会调用传给watcher的render函数，触发属性的get拦截器

2.get拦截器函数中有一句：`dep.depend()`用来收集watcher依赖

3.`dep`实例的`depend()`函数是这样写的：`Dep.target.addDep(this)`，其中`Dep.target`就是当前的渲染函数`watcher`，回到Watcher构造函数中看addDep如何定义的，addDep才是避免依赖收集的关键。

```
addDep (dep: Dep) {
        const id = dep.id
        if (!this.newDepIds.has(id)) {
          this.newDepIds.add(id)
          this.newDeps.push(dep)
           dep.addSub(this)
        }
      }
```

如果newDepIds中没有这个筐子id才会进一步执行，比如执行第一个data.name的get函数中，一步步执行到这里的时候，最开始this.newDepIds是空，this.newDeps也是空数组，因此会把data.name对应的dep1放入this.newDeps中，把这个dep的编号1添加进`this.newDepIds`中，执行`dep.addSub`，把这个渲染watcher放入dep1的subs数组中。

当执行到第二个`data.name`时，`this.newDepIds`已经有编号1了，因此就不会重复收集渲染`watcher`了。

由上可以看出Vue中避免收集重复依赖是在`Watcher`构造函数的`addDep`方法中实现的。

我们进一步思考：当初始化完毕，后面数据变化了重新求值的时候，如何避免收集重复的依赖，比如render函数变成如下所示：

```
function render () {
	return document.write(`年龄：${data.age}`)
}
```

那么`renderWatcher`对象就需要重新调用get函数，注意，每一次调用get函数的时候，都会执行`this.cleanupDeps() `，`this.cleanupDeps() `的定义如下：

```
cleanupDeps () {
        ...
        let tmp = this.depIds
        this.depIds = this.newDepIds
        this.newDepIds = tmp 
        this.newDepIds.clear()
        tmp = this.deps
        this.deps = this.newDeps
        this.newDeps = tmp 
        this.newDeps.length = 0
      }
```

就是把当前的`newDepIds、newDeps`清空，并在清空之前把值赋给`depIds、deps`，也就是说`depIds、deps`总是记录着上一次的依赖数据，我们重新执行get函数会重新触发依赖的收集，再回过头来看addDep函数，其实上面的定义少了一行代码：

```
addDep (dep: Dep) {
    const id = dep.id
    if (!this.newDepIds.has(id)) {
      this.newDepIds.add(id)
      this.newDeps.push(dep)
      if (!this.depIds.has(id)) { //少了这个条件判断
        dep.addSub(this)
      }
    }
  }
```

再一次求值的时候，会判断这个dep编号上一次是不是已经收集过了，如果已经收集过了，也就是`this.depIds.has(id)`为true，就不继续往下执行了，也就是不再收集这个dep了，这就避免了重复计算时的依赖重复收集了。

到现在为止，还不够完美，我们继续思考，因为上面的render函数变成了如下所示：

```
function render () {
	return document.write(`年龄：${data.age}`)
}
```

已经没有`data.name`了，也就是说`data.name`属性的dep1筐子中不应该再有`renderWatcher`这个订阅器了，那么这个是在哪一步中实现的呢？这个清除watcher的逻辑是可以放在cleanupDeps中实现的，我们看完整的cleanupDeps如下：

```
cleanupDeps () {
        let i = this.deps.length
        while (i--) { //这是用来移除watcher的
          const dep = this.deps[i]
          if (!this.newDepIds.has(dep.id)) {
            dep.removeSub(this)
          }
        } 
        let tmp = this.depIds
        this.depIds = this.newDepIds
        this.newDepIds = tmp 
        this.newDepIds.clear()
        tmp = this.deps
        this.deps = this.newDeps
        this.newDeps = tmp 
        this.newDeps.length = 0
      }
```

遍历deps数组，也就是查看每一个依赖筐子，比如最初的render函数造就的筐子数组中放着`[dep1，dep2]`，其中dep1对应着`data.name`的依赖，dep2对应着`data.age`的依赖，后来render改变了，在新的筐子中不再有dep1了，也就是说`this.newDepIds.has(1)`是false了，那么就会继续执行`dep.removeSub(this)`，也就是把dep1筐子中的renderwatcher拿掉。这就完美了，可以看到Watcher构造函数中承载着很多逻辑，包括：

1.在一次求值中，避免重复收集依赖，例子：render中有两个`data.name`。

2.在每一次求值结束时，保留本次的依赖数据，同时如果本个watcher实例和某个dep没关系了，那就从dep筐子中拿到本watcher。

3.在重复求值中，避免重复收集依赖。



持续更新中...

参考资料：

http://hcysun.me/vue-design/art/7vue-reactive.html



