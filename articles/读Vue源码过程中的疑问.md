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

3. 在defineReactive函数中，对getter和setter的判断不理解

   ```
   export function defineReactive (
     obj: Object,
     key: string,
     val: any,
     customSetter?: ?Function,
     shallow?: boolean
   ) {
     const dep = new Dep()
   
     const property = Object.getOwnPropertyDescriptor(obj, key)
     if (property && property.configurable === false) {
       return
     }
   
     // cater for pre-defined getter/setters
     const getter = property && property.get
     const setter = property && property.set
     if ((!getter || setter) && arguments.length === 2) {
       val = obj[key]
     }
     ...
   }
   ```

4. 为什么要在data对象上定义一个`_ob_`属性？只是为了防止data对象被重复监测吗？

   ```
   export function observe (value: any, asRootData: ?boolean): Observer | void {
     if (!isObject(value) || value instanceof VNode) {
       return
     }
     let ob: Observer | void
     if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
       ob = value.__ob__
     } else if (
       shouldObserve &&
       !isServerRendering() &&
       (Array.isArray(value) || isPlainObject(value)) &&
       Object.isExtensible(value) &&
       !value._isVue
     ) {
       ob = new Observer(value)
     }
     if (asRootData && ob) {
       ob.vmCount++
     }
     return ob
   }
   ```
