import d3 from "d3";

import setsEqual from './sets-equal';

const FORCELAYOUT_PARAMS = [
  'gravity',
  'theta',
  'friction',
  'linkStrength',
  'linkDistance',
  'charge',
];

// the props required by force nodes(nodes contains [...forceprops, uiprops])
const DESIRED_FORCE_NODE_PROPS = [
  'name',
  'x',
  'y',
  'fixed',
];

function applySize(force, {size: [width, height]}) {
  // only update if it is not the same as the previous value
  if (force.size()[0] !== width || force.size()[1] !== height) {
    force.size([width, height]);
    force.shouldRun = true;
  }
  return force;
}

function applyForceLayoutVars(force, options) {
  FORCELAYOUT_PARAMS.forEach((paramName) => {
    if (options[paramName] !== force[paramName]()) {
      force[paramName](options[paramName]);
      force.shouldRun = true;
    }
  });
  return force;
}

/* 
  Heavy duty, replace the d3 update pattern
  this is where new nodes and links data is passed to force
  
  The reason behind is NOT to MUTATE the data
  d3 force layout will always mutate x and y
  to avoid that, we give them a new object (Object.assign)
  use set equal checks to avoid unnecessary binding
  
  Notice:
  1. We want to keep the previous x and y value for the same node
  2. For the link, we assume the link from props only havs source and target as string (not the actual reference)
     Thus we always need to built up its reference here 
     ->When there is a new link
     ->when force nodes updated(because force links always need to point to the actual force nodes)
*/
function applyNodesAndLinks(force, {
  links,
  nodes,
}) {
  // set the nodes and links for this force. provide
  // new instances to avoid mutating the underlying values.
  // only update if there are changes.
  const forceNodesSet = new Set(force.nodes().map(getNodeKey));
  const reactNodesSet = new Set(nodes.map(getNodeKey));
  let updateLinks = false;
  if (!setsEqual(forceNodesSet, reactNodesSet)) {
    force.shouldRun = true;
    const key2nodeMap = {}; // set a new map of nodeKey to new force node
    const fnodes = nodes.map((node) => {
      let fnode = {}; // a new force node object
      const nodeKey = getNodeKey(node);
      // update the map
      key2nodeMap[nodeKey] = fnode;
      // copy the desired node properties to the force nodes, Maybe after force nodes copy?
      DESIRED_FORCE_NODE_PROPS.reduce((obj, prop)=>(
        Object.assign(obj, {[prop]: node[prop]})
      ), fnode);
      // copy the previous force node's properties if it previously exists
      // otherwise it will just be at a random position
      if (force.key2nodeMap && (nodeKey in force.key2nodeMap)) {
        Object.assign(fnode, force.key2nodeMap[nodeKey]);
      }
      return fnode;
    });
    // update nodes
    force.nodes(fnodes);
    // update key2nodeMap
    force.key2nodeMap = key2nodeMap;
    updateLinks = true; // must update the links connection if nodes is updated
  }

  const forceLinksSet = new Set(force.links().map(getLinkKey));
  const reactLinksSet = new Set(links.map(getLinkKey));
  if (!setsEqual(forceLinksSet, reactLinksSet) || updateLinks) {
    force.shouldRun = true;
    // use the real 'node' used by the current force
    const flinks = links.map(l=>({
      source: force.key2nodeMap[l.source],
      target: force.key2nodeMap[l.target],
    }));
    // the force link is, just  {source, target}...yeah, what else should it knows?
    force.links(flinks);
  }
}


// KEY, like the key function of d3 data binding, use 'name' as the key
// Modify it to use other key for your data
export function getNodeKey(node) {
  return node.name;
}

export function getLinkKey(link) {
  return `${link.source.name || link.source}-${link.target.name || link.target}`;
}

export function createForce(options) {
  const force = d3.layout.force();
  force.key2nodeMap = {};
  return updateForce(force, options);
}

export function updateForce(force, options) {
  applySize(force, options);
  applyForceLayoutVars(force, options);
  applyNodesAndLinks(force, options);

  if (force.shouldRun) {
    // console.log('should run');
    force.start();
  }
  force.shouldRun = null;
  return force;
}
