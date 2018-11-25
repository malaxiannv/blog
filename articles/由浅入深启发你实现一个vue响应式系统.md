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

再次调用改进后的`$watch函数`，执行`$watch(render, render)`，为什么第二个参数传递的还是render呢？因为第一个参数用来收集依赖，当属性值改变后，就执行render函数重新渲染视图，这也是Vue响应式系统的实现思路。

不过真实的响应系统，还有很多细节需要处理，比如第二个render函数的执行又会触发一次依赖的收集，如何避免重复收集依赖呢？

持续更新中...

参考资料：

http://hcysun.me/vue-design/art/7vue-reactive.html



