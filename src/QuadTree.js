class QuadTree {
  static maxObjPerNode = 5;
  static maxLevel = 5;
  root;
  constructor(width, height) {
    this.root = new Node({
      'left': 0,
      'top': 0,
      'width': width,
      'height': height
    }, 1);
  }
  setObjects = (objList) => {
    if (objList instanceof Array) {
      objList.forEach(function (item) {
        this.root.add(item);
      }, this);
    } else {
      this.root.add(objList);
    }

    this.root.collision();
  }

  clear = () => {
    this.root.clear();
  }

  render = (ctx) => {
    this.root.drawNode(ctx);
  }

  /*
   *显示指定区域内的对象
   */
  showTargets = (ctx, rect) => {
    let objList = this.root.getObjectsByBound(rect);

    objList.forEach(function (item) {
      let bound = item.bound;
      ctx.fillStyle = '#F00';
      ctx.fillRect(bound.left, bound.top, bound.width, bound.height);
    });
  }
}





class Node {

  /*
   **计算当前对象属于四个节点中的哪个
   * -1表示父节点
   * 0：左上
   * 1：左下
   * 2：右下
   * 3：右上
   * 如果返回值是一个数组，说明当前对象跨越了2个以上节点
   */
  static LEFT_TOP = 0;
  static LEFT_BOTTOM = 1;
  static RIGHT_BOTTOM = 2;
  static RIGHT_TOP = 3;

  /*
   *bound 当前节点占据的范围
   *objects 要添加到节点上的对象数组
   *bound:{left, top, width, height}
   */
  constructor(bound, level) {
    this.objects = [];
    this.childNodes = null;
    this.bound = bound;
    this.level = level;
    this.cleaned = true; //用来区分节点是不是被清除过
  }

  drawNode = (ctx) => {

    let bound = this.bound;

    this.childNodes && this.childNodes.forEach(function (item) {
      item.drawNode(ctx);
    });

    this.objects.length > 0 && ctx.strokeRect(bound.left, bound.top, bound.width, bound.height);

    let overlapObj = [];
    this.objects.forEach(function (obj) {

      let bd = obj.bound;

      ctx.strokeRect(bd.left, bd.top, bd.width, bd.height);

      obj.overlap && overlapObj.push(bd);

    });

    ctx.save();
    ctx.fillStyle = '#F00';
    overlapObj.forEach(function (bound) {

      ctx.fillRect(bound.left, bound.top, bound.width, bound.height);

    });
    ctx.restore();
  }

  clear = () => {
    if (this.childNodes) {
      this.childNodes.forEach(function (child) {
        child.clear();
      });
    }
    this.cleaned = true;
    this.objects.length = 0;
  }

  collision = () => {

    let childNodes = this.childNodes;

    if (childNodes) {

      childNodes.forEach(function (item) {
        item.collision();
      });

      let _this = this;
      //对于跨域不同象限的对象，根据对象所属的象限，取出对应象限内所有的对象
      this.objects.forEach(function (item) {

        let objects = _this.getObjectsByBound(item.bound);

        objects.forEach(function (obj) {
          if (_this.rectOverRect(item.bound, obj.bound)) {
            obj.overlap = item.overlap = true;
          }
        });

      });

    }
    let objs = this.objects;
    for (let i = 0, size = objs.length; i < size; i++) {
      for (let k = i + 1; k < size; k++) {
        if (this.rectOverRect(objs[i].bound, objs[k].bound)) {
          objs[i].overlap = objs[k].overlap = true;
        }
      }
    }

  }

  rectOverRect = (bound1, bound2) => {
    return !(bound1.left + bound1.width < bound2.left ||
      bound1.left > bound2.left + bound2.width ||
      bound1.top + bound1.height < bound2.top ||
      bound1.top > bound2.top + bound2.height);
  }

  add = (obj) => {

    if (!obj || !obj.bound) {
      throw new TypeError('arguments must contain {bound}');
    }

    if (!this.cleaned && this.childNodes && this.childNodes.length > 0) {

      let index = this.getIndex(obj.bound);

      if (index > -1) {
        return this.childNodes[index].add(obj);
      }

    } else if (this.objects.length > QuadTree.maxObjPerNode && this.level < QuadTree.maxLevel) {

      this.split();

      let index = this.getIndex(obj.bound);

      if (index > -1) {
        return this.childNodes[index].add(obj);
      }

    }

    //obj.quadrant = index;
    this.objects.push(obj);

  }

  /**
   * 分裂节点
   */
  split = () => {
    let bound = this.bound;

    let halfWidth = (bound.width / 2) >> 0,
      halfHeight = (bound.height / 2) >> 0;

    let level = this.level + 1;

    !this.childNodes && (this.childNodes = [
      new Node({
        'left': bound.left,
        'top': bound.top,
        'width': halfWidth,
        'height': halfHeight
      }, level), //0：左上

      new Node({
        'left': bound.left,
        'top': bound.top + halfHeight,
        'width': halfWidth,
        'height': halfHeight
      }, level), //1：左下

      new Node({
        'left': bound.left + halfWidth,
        'top': bound.top + halfHeight,
        'width': halfWidth,
        'height': halfHeight
      }, level), //2：右下

      new Node({
        'left': bound.left + halfWidth,
        'top': bound.top,
        'width': halfWidth,
        'height': halfHeight
      }, level) //3：右上
    ]);

    let tmpObjects = [];

    this.objects.forEach(function (item) {
      let index = this.getIndex(item.bound);

      if (-1 < index) {
        this.childNodes[index].add(item);
      } else {
        tmpObjects.push(item);
      }

    }, this);
    this.cleaned = false;
    this.objects = tmpObjects;
  }

  getIndex = (objRect) => {
    if (this.childNodes) {

      let rightBottomNode = this.childNodes[2].bound;

      let isBottom = objRect.top >= rightBottomNode.top;
      let isTop = objRect.top + objRect.height <= rightBottomNode.top;

      //判断位置是偏右还是偏左
      if (objRect.left >= rightBottomNode.left) {
        //偏右
        if (isTop) {
          //右上
          return 3;
        } else if (isBottom) {
          //右下
          return 2;
        } else {
          return [2, 3];
        }
      } else if (objRect.left + objRect.width <= rightBottomNode.left) {
        //偏左
        if (isTop) {
          //左上
          return 0;
        } else if (isBottom) {
          //左下
          return 1;
        } else {
          return [0, 1];
        }
      } else {

        if (isTop) {
          //上面所有节点
          return [0, 3];
        } else if (isBottom) {
          //下面所有节点
          return [1, 2];
        }

        //对象跨越了4个节点
        return [0, 1, 2, 3];
      }
    }
    return -1;
  }
  /*
   *获取某个范围内的对象
   */
  getObjectsByBound = (objBound) => {

    let returnObjs = this.objects;

    if (this.childNodes) {
      let index = this.getIndex(objBound);

      if (index > -1) {
        let objList = this.childNodes[index].getObjectsByBound(objBound);
        // returnObjs = returnObjs.concat( objList );
        returnObjs = objList;
      } else if (index !== -1) {
        //如果目标对象跨越2个以上节点
        returnObjs = [];
        index.forEach(function (item) {
          let objList = this.childNodes[item].getObjectsByBound(objBound);
          returnObjs = returnObjs.concat(objList);

        }, this);

      }
    }
    return returnObjs;
  }
}

class Rect {
  static right;
  static bottom;

  constructor(x, y, w, h) {
    this.bound = {
      'left': x,
      'top': y,
      'width': w,
      'height': h
    };
    this.stepX = Math.random() < 0.5 ? -1 : 1;
    this.stepY = Math.random() < 0.5 ? -1 : 1;
  }

  move = () => {
    let step = 1;
    // (this.stepX < 0) && (step = -step);
    (this.stepX < 0) && (step *= -1);

    this.bound.left += step;

    if (this.bound.left < 0 || this.bound.left + this.bound.width > Rect.right) {
      this.stepX = -step;
    }

    step = 1;
    // (this.stepY < 0) && (step = -step);
    (this.stepY < 0) && (step *= -1);

    this.bound.top += step;

    if (this.bound.top < 0 || this.bound.top + this.bound.height > Rect.bottom) {
      this.stepY = -step;
    }
  }
}

export function renderQuadTree(cvs) {
  let ctx = cvs.getContext('2d');

  let cvsWidth = cvs.width,
    cvsHeight = cvs.height;

  let objList = [];

  let [unitWidth, unitHeight] = [10, 10];

  let maxWidth = cvsWidth - unitWidth;
  let maxHeight = cvsHeight - unitHeight;

  Rect.right = cvsWidth;
  Rect.bottom = cvsHeight;

  for (let i = 0; i < 100; i++) {

    objList.push(new Rect((Math.random() * maxWidth) >> 0,
      (Math.random() * maxHeight) >> 0,
      unitWidth, unitHeight));
  }

  let quadTree = new QuadTree(cvsWidth, cvsHeight);

  quadTree.setObjects(objList);

  quadTree.render(ctx);

  const animateInit = {
    animateId: 0,
    cleanQuadTree() {
      window.cancelAnimationFrame(this.animateId);
    }
  };

  let lasttime = 0;

  function mainLoop(timepass) {

    ctx.clearRect(0, 0, cvsWidth, cvsHeight);

    quadTree.clear();

    objList.forEach(function (rect) {
      rect.move();
      rect.overlap = false;
    });

    quadTree.setObjects(objList);
    quadTree.render(ctx);
    let fps = (1000 / (timepass - lasttime)) >> 0;
    ctx.fillText(`FPS ${fps}`, 5, 15);
    lasttime = timepass;
    animateInit.animateId = window.requestAnimationFrame(mainLoop);
  }
  mainLoop();

  return animateInit;
}