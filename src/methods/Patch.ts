import { MethodConfig, RequestState } from '../../typings';
import Alova from '../Alova';
import Method from './Method';

export default class Patch<S extends RequestState, E extends RequestState, R, T> extends Method<S, E, R, T> {
  constructor(context: Alova<S, E>, url: string, config: MethodConfig<R, T>) {
    super('PATCH', context, url, config);
  }
}