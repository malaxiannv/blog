## 前言

读Vue源码的过程中会有很多疑问，但是耐心读下去会发现前面的疑问不断被解开，在此先记录产生过的疑问，解开疑问后会把答案同步在本篇文章中。

## 一、初始化data过程中的疑问

1. 为什么初始化data的时候会在vm实例对象上再添加一个`_data`属性？并把data中定义的属性代理到了_data对象上呢？

   ```
   proxy(vm, `_data`, key)
   
   export function proxy (target: Object, sourceKey: string, key: string) {
     sharedPropertyDefinition.get = function proxyGetter () {
       return this[sourceKey][key]
     }
     sharedPropertyDefinition.set = function proxySetter (val) {
       this[sourceKey][key] = val
     }
     Object.defineProperty(target, key, sharedPropertyDefinition)
   }
   ```

2. 当vm实例上定义的data是函数时，执行这个函数获得真正的data对象时，为什么要pushTarget和popTarget呢？

   ```
   export function getData (data: Function, vm: Component): any {
     // #7573 disable dep collection when invoking data getters
     pushTarget()
     try {
       return data.call(vm, vm)
     } catch (e) {
       handleError(e, vm, `data()`)
       return {}
     } finally {
       popTarget()
     }
   }
   
   Dep.target = null
   const targetStack = []
   
   export function pushTarget (_target: ?Watcher) {
     if (Dep.target) targetStack.push(Dep.target)
     Dep.target = _target
   }
   
   export function popTarget () {
     Dep.target = targetStack.pop()
   }
   ```

3. 在defineReactive函数中，对`if ((!getter || setter) && arguments.length === 2) `语句不理解

   ```
   export function defineReactive (
     obj: Object,
     key: string,
     val: any,
   ) {
     ...
     const property = Object.getOwnPropertyDescriptor(obj, key)
     const getter = property && property.get
     const setter = property && property.set
     if ((!getter || setter) && arguments.length === 2) {
       val = obj[key]
     }
     let childOb = !shallow && observe(val)
     ...
   }
   ```

   这个要从Vue的更新历史说起，最开始的定义是这样的：

   ```
   walk (obj: Object) {
     const keys = Object.keys(obj)
     for (let i = 0; i < keys.length; i++) {
       // 这里传递了第三个参数
       defineReactive(obj, keys[i], obj[keys[i]])
     }
   }
   ```

   后来有个歪果仁给尤大提issue，他的use case是这样的：

   ```
   //要在获取data中的某个属性时执行一些操作，但是不希望data初始化的时候就触发getter中的要执行的逻辑
     const dataProp = {}
     Object.defineProperty(dataProp, 'getterProp', {
       enumerable: true,
       get: function () {
         console.log('这个不应该在一开始就打印出来');
         return 'some value'
       }
     })
   
     new Vue({
       el: '#app',
       data: dataProp
     })
   ```

   如果按照最初的定义，在`walk`函数中调用`defineReactive(obj, keys[i], obj[keys[i]])`时，`obj[keys[i]`就会触发`getterProp`的get函数，因此为了解决这类use case，Vue做了改进：

   ```
   walk (obj: Object) {
     const keys = Object.keys(obj)
     for (let i = 0; i < keys.length; i++) {
       // 在 walk 函数中调用 defineReactive 函数时暂时不获取属性值
       defineReactive(obj, keys[i])
     }
   }
   
   // ================= 分割线 =================
   
   // 在 defineReactive 函数内获取属性值
   if (!getter && arguments.length === 2) {
     val = obj[key]
   }
   ```

   判断要监测的属性值，有自定义的get函数的话，就不执行`val = obj[key]`了，改成这样就完事大吉了吗？还没有，

   后面又有一个歪果仁提出异议，如果既有getter，又有setter时，还是希望可以像之前一样正常获取val值，而且因为上一个歪果仁的case中没有定义setter，所以这个改进不影响他，因此就改成了目前这种状态：

   ```
   const getter = property && property.get
     const setter = property && property.set
     if ((!getter || setter) && arguments.length === 2) {
       val = obj[key]
     }
   ```

   参考issues：

   https://github.com/vuejs/vue/issues/7280#ref-commit-7d6bb83

   https://github.com/vuejs/vue/pull/7828

4. 为什么要在data对象上定义一个`_ob_`属性？

   ```
   export function observe (value: any, asRootData: ?boolean): Observer | void {
     ...
     ob = new Observer(value)
     ...
     return ob
   }
   ```

   这个属性的主要作用是用来收集依赖的，以便开发者使用Vue.set增加属性的时候，也能触发依赖的更新，我们来详细看一下是如何实现的？这个问题也可以变相为Vue.set的更新原理是什么呢？或者Vue.set是如何实现响应式数据更新的呢？

   上面的`observe`函数执行结果是返回一个`ob对象`，找到这个对象的生成语句`ob = new Observer(value)`，接着看Observer构造函数是如何定义的：

   ```
   export class Observer {
     value: any;
     dep: Dep;
     vmCount: number; // number of vms that has this object as root $data
   
     constructor (value: any) {
       this.value = value
       this.dep = new Dep()
       this.vmCount = 0
       def(value, '__ob__', this)
       ...
       this.walk(value)
     }
   
     walk (obj: Object) {
       const keys = Object.keys(obj)
       for (let i = 0; i < keys.length; i++) {
         defineReactive(obj, keys[i])
       }
     }
   	...
   }
   ```

   可见ob是由Observer构造函数创建出来的一个实例对象，这个对象有三个私有属性value、dep和vmCount，其中dep就是用来收集依赖的筐，假设我们有如下这样的一个`data`对象，经过observe函数的处理，这个对象会变成什么呢？

   ```
   data: {
     a: {
       b: 1
     }
   }
   ```

   变成这样：

   ```
   data: {
     a: {
       b: 1,
       _ob_: {value: a, dep, vmcount}
     },
     _ob_: {value: data, dep, vmCount}
   }
   ```

   我们看Observe构造函数的执行逻辑，核心在于defineReactive函数，简化版如下：

   ```
   export function defineReactive (
     obj: Object,
     key: string,
     val: any,
   ) {
     const dep = new Dep()
     let childOb = observe(val)
     Object.defineProperty(obj, key, {
       get: function reactiveGetter () {
         if (Dep.target) {
           dep.depend()
           if (childOb) {
             childOb.dep.depend()
           }
         }
         return value
       },
       ...
   }
   ```

   你可能会奇怪get函数中为什么会有`if (childOb)`的逻辑？我们访问data.a触发这个get函数的时候，把Dep.target收集到了dep这个筐子里，为什么还要收集到`childOb.dep`筐子里呢？childOb是什么呢？以上面的data对象为例，childOb就是一个ob对象{value, dep, vmCount}，也是`data.a._ob_`，把依赖收集到`data.a._ob_.dep`的筐子里，可以在Vue.set(data.a, c, 2)的时候通知订阅了data.a订阅器，告诉他们我更新啦，我们想象一下Vue.set的实现：

   ```
   Vue.set = function (obj, key, value) {
     defineReactive(obj, key, value)
     obj._ob_.dep.notify()
   }
   ```

   呀，没想到纠结一个_`ob`_对象的作用，居然了解了Vue.set或者Vue.delete的实现原理，总结一下：

   在检测data对象的时候，会给data对象的每一个属性值内部再定义一个`_`ob`_`属性，这个属性的值就是一个Observer对象，其中有个私有属性dep用来收集和当前属性相同的依赖。相当于是访问data.a的时候准备了两个筐子收集相同的依赖，以便之后通过Vue.set(data.a, key, value)的方式改变data.a的值时，也能通知这些依赖更新。

5. 终于理解了watch函数中的获取完数据属性后，Target要置为null，因为防止获取data.a的时候把依赖重复添加进去。

6. 