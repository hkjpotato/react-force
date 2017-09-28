# Highly Interactive React Force Layout

![demo](https://raw.githubusercontent.com/hkjpotato/react-force/master/demo.gif)

[Video](https://youtu.be/6x3FctrLcAc)

[Simple Demo](http://bl.ocks.org/hkjpotato/55a25dd75d7a0e8d3d2129a8326b61ca)


### Introduction
After reviewing uber's [react-vis-force](https://github.com/uber/react-vis-force), Sally Wu's [3 approaches](http://bl.ocks.org/sxywu/61a4bd0cfc373cf08884) (especially approach#2) for React + D3 force and other online resources for integrating React and D3 force layout, I finally come up with this HOC component ```createInteractiveForce``` that allows you to make interactive and scalable graph vis using force layout algorithm (d3 v3) in React.

### Why it is a problem?
There are two major approaches to integrate d3 force with React:
 1. Wrap d3 controlled UI as a component (a typical example is [here](http://nicolashery.com/integrating-d3js-visualizations-in-a-react-app/)), and then hook up React lifecycle methods with d3 update pattern.
 2. Just regard d3 force as an additional data source injected, and let React do the rendering (including x and y), e.g. Uber's react-force-vis.
 
Problems with approach #1 is that: you have something live outside React's control. The UI update is controlled by d3's enter/update/exit pattern, not React. This will make state management and event control extremely hard in some cases.

Problems with approach #2 are:
 1. React design pattern requires data to be __IMMUTABLE__.
 2. D3 force will __MUTATE__ the data assigned to it, breaking the immutable rules.
 3. React is __SLOW__ in terms of animation, let's admit it. 
    
Animation is one of the major challenges in React because it takes time to do the dirty checking reconciliation before the actual dom update happens. In approach #2, each ```tick``` event by force will trigger re-rendering of all the nodes and links. It is not scalable and interaction such as dragging is not going to work.


### Solutions
Basically, I don't let React do position related update. Data source are strictly separated into structure data and position data. React controls structure data such as the ```nodes``` and ```links```, and their corresponding ```state``` related data such as ```selected```, ```focused```. Their update will go through React's reconciliation. 

However, the position related data is controlled by d3 force. The update of position (```x``` and ```y```), triggered by ```tick``` event, will perform directly on the dom nodes through ```ref``` to achieve good performance. ( Triggering [imperative animations](https://facebook.github.io/react/docs/refs-and-the-dom.html) is one the major use cases for the ```ref``` function)

To sum up:
 - Structure data (React) and position data (Force) are strictly separated.
 - React's data stays immutable.
 - Let Force mutates the position data.
 - Use a specific ```nodeKey``` to communicate with each other (enter, update, exit).
 - Position related animation happens outside React through  ```ref```. 

Please check [this](http://bl.ocks.org/hkjpotato/55a25dd75d7a0e8d3d2129a8326b61ca) simplified version to get the basic idea as well.

### Challenges
The biggest challenge is how to let Force's data and React's dom talk to each other. In d3, data is bound directly to the dom node ```___data__``` property. Now our position data is not bound to the dom, how can we know the mapping between them?

The key lies in ```key```. In ```utils/d3-force.js```, we have the ```getNodeKey``` function (line#113), which will get the key value from a node data (either a force node or the react node). Meanwhile, whenever the ```render``` function is called, it will update and maintains a key to dom ref map, called ```nodeInstances``` ( line#350 ```components/createInteractiveForce```). Thus in the ```updatePositions``` ( line#329 ```components/createInteractiveForce```), it can loop through the force's data, get the corresponding key value and access the corresponding dom node in O(1).

Also, it will be inefficient to re-set the associated layout's nodes and re-run the force layout when receiving new nodes props. We need a quick way to determine if the new set of nodes is different from the current set controlled by force. I borrow the trick from uber's react-vis-force: compare their __key sets__. Check the ```applyNodesAndLinks``` in ```utils/d3-force``` (line#44) and the ```utils/set-equals``` extracted from uber's source code.


### How to use
This is a demo version, clone it and runs ```npm install```, then run ```npm run start```. You can see an example on ```localhost:3000```.

Check the ```index.js``` in the ```src``` file to get an idea of how to create your own force graph. You have 3 HOCs to help you ```createForceNode```, ```createForceLink```, and ```createInteractiveForce```.

Your presentational components ```Node``` and ```Link``` will receive certain props. You need to set ```ref={domRef}``` to your dom element so that its position can be updated.

Currently, I assume the ```nodes``` all have a ```name``` attribute as the key. Each link has ```source``` and ```target``` attributes, which are the ```name```of the related node. You can modified the ```getNodeKey``` and ```getLinkKey``` function in ```utils/d3-force```.

Key events: ```shift``` triggers brushing, ```meta``` triggers multi-selection, ```"(",")"``` for rotation, ```"-","+"``` for scaling, ```"d", "f"``` for toggling fixed.

### In Addition
 1. the ```ZoomBrushBase``` layer use d3 zoom and brushing. Thus ```zoom```and ```brush``` event is outside React's event system, need to be careful about it. Also, my drag behavior is implemented in an ungly way.
 
 2. If you want to achieve better user experience when brushing, such as [this](http://bl.ocks.org/hkjpotato/f88e818b34827451cc1b3f19a622ad49) example (press ```shift``` and drag to brush, you will see that nodes are selected immediately when brusher covers it), you need to think about making ```selected``` by brushing outside React's control. The rule of thumb is that for anything requires fast UI update (e.g. ```mousemove```), you might want to put it outside React's reconciliation.
 
 3. Some developers separate frontend's state into App state and UI state. (App state => Redux's store; UI state => local components' state). I feel like fast animation data is not even 'UI state' (I might be wrong). Maybe call it instantaneous UI state?
