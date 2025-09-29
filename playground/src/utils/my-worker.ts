import { defineWorker } from '@ezview/threadpool'

export interface MyWorkerArgs {
  id: number
  name: string
  data: ArrayBuffer
}

defineWorker(main)

function main(args: MyWorkerArgs) {
  console.log(args.id, args.name, args.data)
  return '执行完毕'
}
