import {
  LocalCacheConfigParam,
  SerializedMethod
} from '../../typings';
import Alova from '../Alova';
import Method from '../Method';
import { clearTimeoutTimer, falseValue, forEach, getConfig, getOptions, JSONStringify, MEMORY, nullValue, objectKeys, setTimeoutFn, STORAGE_PLACEHOLDER, STORAGE_RESTORE, undefinedValue } from './variables';

/**
 * 空函数，做兼容处理
 */
export const noop = () => {};

// 返回自身函数，做兼容处理
export const self = <T>(arg: T) => arg;

/**
 * 判断参数是否为函数
 * @param fn 任意参数
 * @returns 该参数是否为函数
 */
export const isFn = (arg: any): arg is Function => typeof arg === 'function';

/**
 * 判断参数是否为数字
 * @param arg 任意参数
 * @returns 该参数是否为数字
 */
export const isNumber = (arg: any): arg is number => typeof arg === 'number' && !isNaN(arg);


/**
 * 判断参数是否为字符串
 * @param arg 任意参数
 * @returns 该参数是否为字符串
 */
 export const isString = (arg: any): arg is string => typeof arg === 'string';


// 判断是否为普通对象
export const isPlainObject = (arg: any): arg is Object => Object.prototype.toString.call(arg) === '[object Object]';

// 判断是否为某个类的实例
export const instanceOf = <T>(arg: any, cls: new (...args: any[]) => T): arg is T => arg instanceof cls;

// 判断是否为数组
export const isArray = (arg: any): arg is any[] => Array.isArray(arg);


// type ObjectPromise<I> = I extends undefined ? {} : I;
// export const assign = <T extends unknown[] | []>(...args: T) => {
//   type T0 = ObjectPromise<T[0]>;
//   type T1 = ObjectPromise<T[1]>;
//   type T2 = ObjectPromise<T[2]>;
//   type T3 = ObjectPromise<T[3]>;
//   type T4 = ObjectPromise<T[4]>;
//   type T5 = ObjectPromise<T[5]>;
//   type T6 = ObjectPromise<T[6]>;
//   type T7 = ObjectPromise<T[7]>;
//   type T8 = ObjectPromise<T[8]>;
//   type T9 = ObjectPromise<T[9]>;
//   type T10 = ObjectPromise<T[10]>;
//   // convert union type to intersection type
//   return 1 as any as T0 & T1 & T2 & T3 & T4 & T5 & T6 & T7 & T8 & T9 & T10;
// };


/**
 * 获取请求方式的key值
 * @returns {string} 此请求方式的key值
 */
export const key = <S, E, R, T, RC, RE, RH>(methodInstance: Method<S, E, R, T, RC, RE, RH>) => {
  const { type, url, requestBody } = methodInstance;
  const { params, headers } = getConfig(methodInstance);
  return JSONStringify([
    type,
    url,
    params,
    requestBody,
    headers,
  ]);
}

/**
 * 序列化请求方法对象
 * @param methodInstance 请求方法对象
 * @returns 请求方法的序列化对象
 */
export const serializeMethod = <S, E, R, T, RC, RE, RH>(methodInstance: Method<S, E, R, T, RC, RE, RH>) => {
  const {
    type,
    url,
    config,
    requestBody
  } = methodInstance;
  return {
    type,
    url,
    config,
    requestBody
  };
}


/**
 * 反序列化请求方法对象
 * @param methodInstance 请求方法对象
 * @returns 请求方法对象
 */
export const deserializeMethod = <S, E, RC, RE, RH>({
  type,
  url,
  config,
  requestBody
}: SerializedMethod<any, any, RC, RH>, alova: Alova<S, E, RC, RE, RH>) => new Method<S, E, any, any, RC, RE, RH>(type, alova, url, config, requestBody);

/**
 * 创建防抖函数，只有enable为trueValue时会进入防抖环节，否则将立即触发此函数
 * 场景：在调用useWatcher并设置了immediate为trueValue时，首次调用需立即执行，否则会造成延迟调用
 * @param fn 回调函数
 * @param delay 延迟描述
 * @param enable 是否启用防抖
 * @returns 延迟后的回调函数
 */
export const debounce = (fn: Function, delay: number, enable: () => boolean) => {
  let timer: any = nullValue;
  return function(this: any, ...args: any[]) {
    const bindFn = fn.bind(this, ...args);
    if (!enable()) {
      bindFn();
      return;
    }
    if (timer) {
      clearTimeoutTimer(timer);
    }
    timer = setTimeoutFn(bindFn, delay);
  };
}


/**
 * 获取缓存的配置参数，固定返回{ e: number, s: boolean }格式的对象
 * e为expire缩写，表示缓存失效时间，单位为毫秒
 * s为storage缩写，是否存储到本地
 * @param localCache 本地缓存参数
 * @returns 统一的缓存参数对象
 */
export const getLocalCacheConfigParam = <S, E, R, T, RC, RE, RH>(methodInstance?: Method<S, E, R, T, RC, RE, RH>, localCache?: LocalCacheConfigParam) => {
  const _localCache = localCache !== undefinedValue
    ? localCache 
    : methodInstance 
      ? (getOptions(methodInstance).localCache || getConfig(methodInstance).localCache) 
      : undefinedValue;
  const defaultCacheMode = MEMORY;
  if (isNumber(_localCache)) {
    return {
      e: _localCache,
      m: defaultCacheMode,
      s: falseValue,
      t: undefinedValue,
    }
  }
  const {
    mode = defaultCacheMode,
    expire = 0,
    tag
  } = _localCache || {};
  return {
    e: expire,
    m: mode,
    s: [STORAGE_PLACEHOLDER, STORAGE_RESTORE].includes(mode),
    t: tag ? tag.toString() : undefinedValue,
  };
}


/**
 * 深度走查正在更新的数据，当一个数据以如下格式呈现时，则需要在响应后将它替换为实际数据
 * 1. 完整格式
 * {
        action: 'responsed',
        value: d => d.id,
        default: 0,
    },
    2. 在对象中可以这样简写
    '+id': d => d.id,  // 无默认值情况
    '+id': [d => d.id, 0],  // 有默认值情况
 * @param data 待解析数据
 * @returns 待替换数据的位置，及转换函数
 */
export const walkUpatingDataStructure = (data: any) => {
  const catchedUpdateAttrs: {
    p: (number | string)[],
    h: Function,
  }[] = [];

  // 解析函数
  const parseResponsedStructure = (attr: any, key?: string) => {
    let structure: { h: Function, d?: any } | undefined = undefined;
    if (isPlainObject(attr)) {
      const { action: a, value: h, default: d } = attr;
      if (a === 'responsed' && isFn(h)) {
        structure = { h, d };
      }
    } else if (key && key[0] === '+') {
      if (isFn(attr)) {
        structure = { h: attr };
      } else if (isArray(attr) && isFn(attr[0])) {
        structure = { h: attr[0], d: attr[1] };
      }
    }
    return structure;
  }

  let finalData = data;
  // 遍历对象或数组内的单个项处理
  const replaceStr = (key: string) => key.replace(/^\+/, '');
  const walkItem = (item: any, position: (number | string)[], key?: string | number, parent?: any) => {
    const structure = parseResponsedStructure(item, isString(key) ? key : undefinedValue);
    if (structure) {
      const { h, d } = structure;
      catchedUpdateAttrs.push({
        p: position,
        h,
      });
      if (key !== undefinedValue) {
        const keyReplaced = isString(key) ? replaceStr(key) : key;
        if (keyReplaced !== key) {
          delete parent[key];
        }
        parent[keyReplaced] = d;
      } else {
        finalData = d;
      }
    } else if (isPlainObject(item)) {
      // 遍历对象
      forEach(objectKeys(item), key => walkItem(item[key], [...position, replaceStr(key)], key, item));
    } else if (isArray(item)) {
      // 遍历数组
      forEach(item, (arrItem, i) => walkItem(arrItem, [...position, i], i, item));
    }
  };

  walkItem(data, []);
  return {
    f: finalData,
    c: catchedUpdateAttrs
  };
};