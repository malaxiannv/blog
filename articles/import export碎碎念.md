## 奔主体、上干货

export有两种导出方式，命名导出和默认导出，看代码

```
//命名导出
export function FunctionName(){...}
export let name1 = …, name2 = …, …, nameN;

//默认导出
export default function (…) { … }
export name1
```

相对应的，import也有两种引入方式，分别为引入命名导出、引入默认导出，看代码

```
//引入命名导出
import { FunctionName, name1, name2 } from './A.js'

//引入默认导出
import FunctionName from './A.js'
```

注意：引入默认导出时名字随便起，阿猫阿狗都没问题，但是引入命名导出时，需要和导出名一一对应，人家导出的变量是name1，你就不能用name2来引入。

还有一点：有没有注意到引入命名导出时，都是把变量放到了一个花括号中了，为什么呢？这里是用了ES6的解构语法，一个模块的所有命名导出默认是存放在一个对象中的，因此这里采用解构写法把他们一一从大对象中取出。











