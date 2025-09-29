import MyWorker from './my-worker?worker'

export function newMyWorker(): Worker {
  return new MyWorker()
}
