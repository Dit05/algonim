

export type Point = {
  x: number,
  y: number
}

export function Point(x: number, y: number): Point {
  return { x, y }
}


export type Vector = {
  x: number,
  y: number
}

export function Vector(x: number, y: number): Vector {
  return { x, y }
}

export class VectorUtil {

  public static scale(v: Vector, s: number): Vector {
    return Vector(v.x * s, v.y * s)
  }

  public static add(a: Vector, b: Vector): Vector {
    return Point(a.x + b.x, a.y + b.y)
  }

  public static subtract(a: Vector, b: Vector): Vector {
    return Point(a.x - b.x, a.y - b.y)
  }

}


export type Size = {
  width: number,
  height: number
}

export function Size(width: number, height: number): Size {
  return { width, height }
}

export class SizeUtil {

  public static toVector(size: Size): Vector {
    return Vector(size.width, size.height)
  }

  public static shrink(s: Size, amount: number): Size {
    return Size(s.width - amount, s.height - amount)
  }

}
