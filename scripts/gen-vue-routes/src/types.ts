import type { _RouteRecordBase, RouteComponent } from 'vue-router'

type Lazy<T> = () => Promise<T>
type RawRouteComponent = RouteComponent | Lazy<RouteComponent>

// 增量配置
export interface RouteRecordOption extends _RouteRecordBase {
  component?: RawRouteComponent
  components?: Record<string, RawRouteComponent>
}
