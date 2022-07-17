// import { Ref } from 'vue';
import { Progress, FrontRequestState, ExportedType, UseHookConfig } from '../../typings';
import Alova from '../Alova';
import Method from '../Method';
import { getResponseCache, removeStateCache, setResponseCache, setStateCache } from '../storage/responseCache';
import { getPersistentResponse } from '../storage/responseStorage';
import { debounce, getLocalCacheConfigParam, key, noop } from '../utils/helper';
import { falseValue, STORAGE_RESTORE, trueValue, undefinedValue } from '../utils/variables';
import useHookToSendRequest from './useHookToSendRequest';

// type ExportedType<R, S> = S extends Ref ? Ref<R> : R;    
/**
 * 创建请求状态，统一处理useRequest、useWatcher、useEffectWatcher中一致的逻辑
 * 该函数会调用statesHook的创建函数来创建对应的请求状态
 * 当该值为空时，表示useFetcher进入的，此时不需要data状态和缓存状态
 * @param method 请求方法对象
 * @param handleRequest 请求处理的回调函数
 * @param methodKey 请求方法的key
 * @param watchedStates 被监听的状态，如果未传入，直接调用handleRequest
 * @param immediate 是否立即发起请求
 * @param debounceDelay 请求发起的延迟时间
 * @returns 当前的请求状态
 */
export default function createRequestState<S, E, R, T>(
  {
    id,
    options,
    storage,
  }: Alova<S, E>,
  handleRequest: (
    originalState: FrontRequestState,
    hitStorage: boolean,
    setAbort: (abort: () => void) => void
  ) => void,
  methodInstance?: Method<S, E, R, T>,
  initialData?: any,
  watchedStates?: E[],
  immediate = trueValue,
  debounceDelay = 0
) {
  const {
    create,
    export: stateExport,
    effectRequest,
  } = options.statesHook;

  // 如果有持久化数据则先使用它
  const methodKey = methodInstance ? key(methodInstance) : undefinedValue;
  const persistentResponse = methodKey ? getPersistentResponse(id, methodKey, storage) : undefinedValue;
  const hitStorage = persistentResponse !== undefinedValue;   // 命中持久化数据
  const rawData = hitStorage ? persistentResponse : initialData;

  const progress = {
    total: 0,
    loaded: 0,
  };
  const originalState = {
    loading: create(falseValue),
    data: create(rawData),
    error: create(undefinedValue as Error | undefined),
    downloading: create({ ...progress }),
    uploading: create({ ...progress }),
  };
  let removeState = noop;
  if (methodInstance && methodKey) {
    // 如果有methodKey时，将初始状态存入缓存以便后续更新
    setStateCache(id, methodKey, originalState);

    // 设置状态移除函数，将会传递给hook内的effectRequest，它将被设置在组件卸载时调用
    removeState = () => removeStateCache(id, methodKey);

    // 如果有持久化数据，则需要判断是否需要恢复它到缓存中
    if (persistentResponse) {
      const {
        e: expireMilliseconds,
        m: cacheMode,
      } = getLocalCacheConfigParam(methodInstance);
      // 如果是STORAGE_RESTORE模式，且缓存没有数据时，则需要将持久化数据恢复到缓存中
      cacheMode === STORAGE_RESTORE && !getResponseCache(id, methodKey) && setResponseCache(id, methodKey, persistentResponse, expireMilliseconds);
    }
  }
  let abortFn = noop;

  // 调用请求处理回调函数
  let handleRequestCalled = falseValue;
  const wrapEffectRequest = () => {
    handleRequest(
      originalState,
      hitStorage,
      abort => abortFn = abort,
    );
    handleRequestCalled = trueValue;
  };

  watchedStates !== undefinedValue ? effectRequest(
    debounceDelay > 0 ? 
      debounce(wrapEffectRequest, debounceDelay, () => !immediate || handleRequestCalled) :
      wrapEffectRequest,
    removeState,
    watchedStates,
    immediate
  ) : effectRequest(wrapEffectRequest, removeState);
  
  const exportedState = {
    loading: stateExport(originalState.loading) as unknown as ExportedType<boolean, S>,
    data: stateExport(originalState.data) as unknown as ExportedType<R, S>,
    error: stateExport(originalState.error) as unknown as ExportedType<Error|null, S>,
    downloading: stateExport(originalState.downloading) as unknown as ExportedType<Progress, S>,
    uploading: stateExport(originalState.uploading) as unknown as ExportedType<Progress, S>,
  };
  return {
    ...exportedState,
    abort: () => abortFn(),
    
    // 通过执行该方法来手动发起请求
    send<T>(methodInstance: Method<S, E, R, T>, useHookConfig: UseHookConfig<R>, forceRequest: boolean, responserHandlerArgs?: any[], updateCacheState?: boolean) {
      const { abort, p } = useHookToSendRequest(
        methodInstance,
        originalState,
        useHookConfig,
        responserHandlerArgs,
        forceRequest,
        updateCacheState
      );
      abortFn = abort;
      return p;
    },
  };
}