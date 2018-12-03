## 从一个列子开始，我们沿着Vue的源码分析计算属性的实现机制：

```
data () {
  return {
    a: 1
  }
},
computed: {
  compA () {
    return this.a + 1
  }
}

<div>{{compA}}</div>
```

先抛开例子，看下初始化计算属性都做了什么？以下所有源代码都是简易版

```
function initComputed (vm: Component, computed: Object) {
      const watchers = vm._computedWatchers = Object.create(null)
      for (const key in computed) {
        const userDef = computed[key]
        const getter = typeof userDef === 'function' ? userDef : userDef.get
        watchers[key] = new Watcher(
          vm,
          getter || noop,
          noop,
          computedWatcherOptions
        )
        defineComputed(vm, key, userDef)
      }
    }
```

做了两件事：1.遍历计算属性对象，针对每个key创建了一个计算属性观察者  2.在vm组件实例上定义上这些计算属性

再回到上面的例子中，初始化完计算属性，vm.compA已经有值了，略过`defineComputed(vm, key, userDef)`的源码，我们直接看下定义完的结果是什么？

```
vm.compA = {
      enumerable: true,
      configurable: true,
      get: function computedGetter () {
        const watcher = this._computedWatchers && this._computedWatchers['compA']
        if (watcher) {
          watcher.depend() 
          return watcher.evaluate()
        }
      },
      set: noop
    }
```

例子中有这一句`<div>{{compA}}</div>`，也就是在执行渲染函数的时候，会触发计算属性`compA`的get访问器属性，也就是上面的`computedGetter`函数，我们看下这个函数会执行什么逻辑：

```
// 核心的是watcher.depend()
    depend () {
      if (this.dep && Dep.target) { 
        this.dep.depend()
      }
    }
```

也就是触发计算属性的getter后，这个计算属性的筐子dep会收集一个依赖，这个依赖是什么呢？要看`Dep.target`是什么，我们回想一下整个过程：首先渲染函数的执行会读取计算属性 `compA` 的值，从而触发计算属性 `compA` 的 `get` 拦截器函数，最终调用了 `this.dep.depend()` 方法收集依赖。这个过程中的关键一步就是渲染函数的执行，我们知道在渲染函数执行之前 `Dep.target` 的值必然是 **渲染函数的观察者对象**。所以计算属性观察者对象的 `this.dep` 属性中所收集的就是渲染函数的观察者对象。

接下来还有一句`watcher.evaluate()`，看下`evaluate()`的逻辑：

```
evaluate () {
      this.value = this.get()
      return this.value
    }
```

也就是触发了计算属性的getter之后做了两件事：1.收集渲染函数观察者作为依赖，扔进dep筐子中 2.对计算属性求值，并返回这个值。

回到上面的例子，计算属性的值是：

```
function () {
    return this.a + 1
  }
```

执行这个函数会触发响应属性a的getter函数，从而在a属性的筐子里收集一个计算属性comA这个依赖，计算属性的依赖中又收集了渲染函数观察者，因此属性a的变化会触发计算属性comA的更新，我们看下update函数中执行了什么逻辑：

```
    update () {
      if (this.computed) {
        this.dep.notify()
      }
      ...
    }
```

update中又通知计算属性的dep筐子中的观察者去更新，因此就通知到了渲染函数观察者，渲染函数执行更新操作，从而完成了整个响应流程。

总结一下：

计算属性和普通属性不一样的地方：计算属性是惰性求值的，并没有在初始化的时候就执行`this.value = this.get()`去求值，而是在用到计算属性的地方，比如在渲染函数中使用计算属性，进而触发计算属性的求值。

参考资料：

http://hcysun.me/vue-design/art/8vue-reactive-dep-watch.html#watch%E5%92%8Cwatch%E9%80%89%E9%A1%B9%E7%9A%84%E5%AE%9E%E7%8E%B0