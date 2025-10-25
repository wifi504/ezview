import type { ComponentResolver } from 'unplugin-vue-components'

// 把组件名解析出来，分别得到 库名 和 图标组件名
function splitIconName(str: string): [string, string] | null {
  const match = str.match(/^Vi([A-Z][a-z0-9]*)(?=[A-Z])(.+)$/)
  if (!match) return null
  const [, firstWord, rest] = match
  return [firstWord, rest]
}

/**
 * <b>Resolver for X-Icons</b>
 * <p>
 *   匹配这样的格式：`<ViLibraryComponentName />` <br>
 *   自动解析成：`typeof import('@vicons/library')['ComponentName']` <br>
 * </p>
 * @link https://www.xicons.org
 * @author WIFI连接超时
 */
export function VIconsResolver(): ComponentResolver {
  return function (name: string) {
    if (name.startsWith('Vi')) {
      const split = splitIconName(name)
      if (split && split[0] && split[1]) {
        return {
          name: split[1],
          from: `@vicons/${split[0].toLowerCase()}`,
        }
      }
    }
  }
}
