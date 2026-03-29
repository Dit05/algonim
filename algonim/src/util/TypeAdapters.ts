

export type CouldBeIterable<T> = ArrayLike<T> | Iterable<T>

function isIterable<T>(obj: any): obj is Iterable<T> {
  return (obj !== null) && (Symbol.iterator in obj) && (typeof(obj[Symbol.iterator]) === 'function')
}

export function makeIterable<T>(obj: CouldBeIterable<T>): Iterable<T> {
  if(isIterable(obj)) {
    return obj
  } else {
    const narrowedObj: ArrayLike<T> = obj
    return function*() {
      for(let i = 0; i < narrowedObj.length; i++) {
        yield narrowedObj[i]
      }
    }() // Genuis! Construct a generator function, then immediately invoke it.
  }
}

export function iterateDataViewBytes(dataView: DataView): Iterable<number> {
  return function*() {
    for(let i = 0; i < dataView.byteLength; i++) {
      yield dataView.getUint8(i)
    }
  }()
}
