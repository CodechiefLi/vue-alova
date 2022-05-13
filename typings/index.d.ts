type RequestState<R = unknown> = {
  loading: any,
  data: R,
  error: any,
  progress: any,
};
export type MethodType = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD' | 'OPTIONS' | 'PATCH' | 'TRACE';
// silent config
export interface SilentConfig {
  push(key: string, config: unknown): void,
  pop(): unknown,
}
// 数据持久化配置
type PersistResponse = {
  set: (key: string, response: unknown) => void,
  get: (key: string) => unknown,
};

type CommonMethodParameters = {
  url: string,
  readonly method: MethodType,
  data?: Data,
}

// 局部的请求缓存时间，如缓存时间大于0则使用url+参数的请求将首先返回缓存数据
// 时间为秒，小于等于0不缓存，Infinity为永不过期
// 也可以设置函数，参数为全局responsed转化后的返回数据和headers对象，返回缓存时间
type StaleTime<T> = number | ((data: T, headers: Record<string, any>, method: MethodType) => number);
export type MethodConfig<R, T> = {
  params?: Record<string, any>,
  headers?: RequestInit['headers'],
  silent?: boolean,
  timeout?: number,    // 当前中断时间
  staleTime?: StaleTime<T>,   // get、head请求默认缓存5分钟（300秒），其他请求默认不缓存
  persist?: boolean,    // 持久化响应数据
  responsed?: (data: T, headers: Record<string, any>) => any,
} & RequestInit;

// 获取fetch的第二个参数类型
type RequestInit = NonNullable<Parameters<typeof fetch>[1]>;
type RequestConfig = CommonMethodParameters & MethodConfig<Record<string, any>> & RequestInit;
// 泛型类型解释：
// S: create函数创建的状态组的类型
// E: export函数返回的状态组的类型
export interface AlovaOptions<S extends RequestState, E extends RequestState> {
  // base地址
  baseURL: string,
  
  // 状态hook函数，用于定义和更新指定MVVM库的状态
  statesHook: {
    create: () => S,
    export: (state: S) => E,
    update: (newVal: Partial<RequestState>, state: S) => void,
    watch: (args: any[], handler: () => void) => void,
  },

  // 请求超时时间
  timeout?: number,

  // 请求缓存时间，如缓存时间大于0则使用url+参数的请求将首先返回缓存数据
  // 时间为秒，小于等于0不缓存，Infinity为永不过期
  // get、head请求默认缓存5分钟（300秒），其他请求默认不缓存
  // 也可以设置函数，参数为responsed转化后的返回数据和headers对象，返回缓存时间
  staleTime?: StaleTime,

  // 静默请求配置
  // 以下的key都是自动拼接了对应前缀的key
  silentConfig?: SilentConfig,

  // 响应数据持久化配置，如果设置了且某些请求也设置了持久化参数，则会将请求结果持久化
  // 具体持久化方案需自定义，如使用localStorage
  persistResponse?: PersistResponse,

  // 全局的请求前置钩子
  beforeRequest?: (config: RequestConfig) => RequestConfig | void,

  // 全局的响应钩子
  responsed?: (response: Response) => Promise<any>,
}