import { Point, Vector, Size } from '@/gfx/Primitives'
import { Color, ColorUtil } from '@/gif/Color'
import { Drawer } from '@/gfx/Drawer'
import { RasterModel } from './RasterModel'
import { KDTree } from '@/util/KDTree'


type Data = {
  tree: KDTree,
  stringyMap: Map<string, Color>
}

export class Voronoi extends RasterModel<Data> {

  public readonly points: Map<Point, Color> = new Map()
  public rootColor: Color | undefined = ColorUtil.rgb(1, 1, 1)

  protected prepare(_drawer: Drawer): Data {
    const points: number[][] = new Array()
    const stringyMap = new Map<string, Color>()
    for(const kvp of this.points) {
      points.push([kvp[0].x, kvp[0].y])
      stringyMap.set(Voronoi.pointToKey(kvp[0]), kvp[1])
    }

    const tree = new KDTree(points)

    return {
      tree,
      stringyMap
    }
  }

  protected getColor(point: Point, data: Data) {
    const nearest = data.tree.findNearest([point.x, point.y])
    return data.stringyMap.get(Voronoi.pointToKey(Point(nearest.point[0], nearest.point[1]))) ?? ColorUtil.rgb8(0, 0, 0)
  }

  protected finish(drawer: Drawer, _data: Data) {
    if(this.rootColor !== undefined) {
      for(const point of this.points.keys()) {
        drawer.drawRectangle(Point(point.x - 1, point.y), Size(2, 2), null, ColorUtil.toHexString(this.rootColor))
      }
    }
  }

  private static pointToKey(point: Point): string {
    return `${point.x},${point.y}`
  }

}
