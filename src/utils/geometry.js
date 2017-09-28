import d3 from "d3";

// UI related methods (used it for calculating the contour!)
function getCentroid(fnodes) {
  let vertices = fnodes.map(d=>[d.x, d.y]);
  let getHullVertices =  d3.geom.hull(vertices);
  return d3.geom.polygon(getHullVertices).centroid();
}

export function partialRotate(fnodes, deg) {
  function rotateAround([x, y], old, deg) {
    var cos = Math.cos, sin = Math.sin, r = deg / 180 * Math.PI;
    var newX = (old.x - x) * cos(r) - (old.y - y) * sin(r) + x;
    var newY = (old.x - x) * sin(r) + (old.y - y) * cos(r) + y;
    return [newX, newY];
  }
  // get centroid of given nodes
  let centroid = getCentroid(fnodes);
  fnodes.forEach(fnode => {
    const newPos = rotateAround(centroid, fnode, deg);
    fnode.px = newPos[0];
    fnode.py = newPos[1];
  });
  return fnodes;
}

export function partialScale(fnodes, scale) {
    function getNewPos([x, y], old, scale) {
      return [
        (old.x - x) * scale + x,
        (old.y - y) * scale + y
      ]
    }
    const centroid = getCentroid(fnodes);
    fnodes.forEach(fnode=>{
      const newPos = getNewPos(centroid, fnode, scale);
      fnode.px = newPos[0];
      fnode.py = newPos[1];
    });
    return fnodes;
}

export function nudge(fnodes, dx, dy) {
    fnodes.forEach(fnode=>{
      fnode.px += dx;
      fnode.py += dy;
    });
    return fnodes;
}

export function getSvgPosition(container, { clientX, clientY }) {
  // borrow from d3 source code
  let svg = container.ownerSVGElement || container;
  let pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  return pt.matrixTransform(container.getScreenCTM().inverse());
}

