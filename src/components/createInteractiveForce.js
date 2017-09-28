import React, { PropTypes } from 'react';
import forcePropTypes, { DEFAULT_FORCE_PROPS } from '../propTypes/force';
import ZoomBrushBase from './ZoomBrushBase';

//force utils
import * as forceUtils from '../utils/d3-force';
const {createForce, updateForce, getNodeKey, getLinkKey} = forceUtils;

//geometry utils
import { getSvgPosition, partialRotate, partialScale, nudge } from '../utils/geometry';


export default function createInteractiveForce(ForceNode, ForceLink) {
  return class InteractiveForce extends React.PureComponent {
    static get propTypes() {
      return {
        // children
        nodes: PropTypes.array,
        links: PropTypes.array,
        filtered: PropTypes.object,

        // size for svg, ZoomBrushBase, not the force size
        width: PropTypes.number,
        height: PropTypes.number,

        // force layout options
        forceOptions: forcePropTypes,

        //for external iteraction
        onNodeFocus: PropTypes.func, //change focused state
        onLinkFocus: PropTypes.func, //change focused state
        onCleanFocus: PropTypes.func, //clean the background
      
        //For the time-being, selectedNodes/focusedNode/focusedLink is local state
        //Later might sync props and state using similar approach https://github.com/uber/react-vis-force/blob/master/src/components/InteractiveForceGraph.js
      };
    }

    static get defaultProps() {
      return {
        forceOptions: DEFAULT_FORCE_PROPS,

        //default empty callback props
        onNodeFocus() {},
        onLinkFocus() {},
        onCleanFocus() {},
      }
    }

    constructor(props) {
      super(props);
      const {nodes, links, forceOptions} = this.props;
      //when we create the force, the force will have a map called key2nodeMap
      //that map nodeKey to force nodes maintained by force
      this.force = createForce({
        ...DEFAULT_FORCE_PROPS,
        ...forceOptions,
        nodes,
        links
      });

      //key maps to the node and link instances created by react
      //!Important, the above maps help the force and react communicate with each other
      this.nodeInstances = {};
      this.linkInstances = {};

      //of course we need to bind the tick function
      this.force.on('tick', ()=>{
        this.updatePositions()
      });

      //bind the private events handlers here for all the private locations related event
      //notice we always bind the callback here because we are using PureComponent and we want to avoid uneccessary re-render
      this.onNodeMouseDown = this.onNodeMouseDown.bind(this);
      this.onNodeClick = this.onNodeClick.bind(this);
      this.onLinkClick = this.onLinkClick.bind(this);
      this.onBrushEnd = this.onBrushEnd.bind(this); //for multiSelectable, nudge, rotate, scale, fix
      this.onSvgKeyDown = this.onSvgKeyDown.bind(this); //for multiSelectable, nudge, rotate, scale, fix
      this.onSvgKeyUp = this.onSvgKeyUp.bind(this); //for multiSelectable
      this.onSvgClick = this.onSvgClick.bind(this); //for clean selected & focused
      
      //drag behavior
      this.onNodeDragStart = this.onNodeDragStart.bind(this);
      this.onNodeDrag = this.onNodeDrag.bind(this);
      this.onNodeDragEnd = this.onNodeDragEnd.bind(this);

      this.state = {
        selectedNodes: new Set(),
        focusedNode: null,
        focusedLink: null,
      }
    }

    // expose API function for parent component to access position by key
    getPosition(nodeKey) {
      return this.force.key2nodeMap[nodeKey];
    }

    // expose API function for parent component to get a Set of selected nodes' keys
    getSelectedNodes() {
      return this.state.selectedNodes;
    }

    // state management
    onNodeMouseDown(event, node) {
      event.stopPropagation();
      const nodeKey = getNodeKey(node);
      //we want to keep the logic here simple
      //for better user experience, check http://bl.ocks.org/hkjpotato/f88e818b34827451cc1b3f19a622ad49
      if (!this.state.selectedNodes.has(nodeKey)) {
        //if it is not selected, only select itself unless multiSelectable
        if (this.state.multiSelectable) {
          this.setState({
            selectedNodes: new Set([...this.state.selectedNodes, nodeKey])
          })
        } else {
          this.setState({
            selectedNodes: new Set([nodeKey])
          })
        }
      }
      this.onNodeDragStart(event)
    }

    onNodeClick(event, node) {
      event.stopPropagation(); //prevent svg click
      if (window.nodeDragging) return; //don't do anything on nodeDragging
      this.setState({
        focusedNode: node,
        focusedLink: null,
      });
      this.props.onNodeFocus(event, node);
    }

    onLinkClick(event, link) {
      event.stopPropagation(); //prevent svg click
      this.setState({
        focusedLink: link,
        focusedNode: null,
      });
      this.props.onLinkFocus(event, link);
    }

    onBrushEnd(extent) {
      const withinExtent = ({x, y}) => (
        extent[0][0] <= x && 
        x < extent[1][0] && 
        extent[0][1] <=y && 
        y < extent[1][1]
      );
      const withinSet = this.force.nodes().reduce((set, fnode) => {
        if (withinExtent(fnode)) set.add(getNodeKey(fnode))
        return set;
      }, new Set());
      if (this.state.multiSelectable) {
        this.setState({
          selectedNodes: new Set([...this.state.selectedNodes, ...withinSet])
        });
      } else {
        this.setState({
          selectedNodes: withinSet
        })
      }
    }

    onSvgKeyDown(event) {
      event.preventDefault();
      if (event.metaKey) {
        this.setState({
          multiSelectable: true
        });
        return;
      }

      if (!event.metaKey || !event.shiftKey) switch (event.keyCode) {
        case 38: this.nudge( 0, -1); break; // UP
        case 40: this.nudge( 0, +1); break; // DOWN
        case 37: this.nudge(-1,  0); break; // LEFT
        case 39: this.nudge(+1,  0); break; // RIGHT
        case 68: this.toggleFixed(false); break; // 'd', unfix selected
        case 70: this.toggleFixed(true); break; // 'f', fixed selected
        case 187: this.partialScale(1.05); break; // '+', scaleup
        case 189: this.partialScale(1/1.05); break; // '-', scaledown
        case 48: this.partialRotate(2); break; // '(', rotate anti-clockwise
        case 57: this.partialRotate(-2); break; // ')', rotate clockwise
      }

    }

    onSvgKeyUp(event) {
      this.setState({
        multiSelectable: false
      });
    }

    onSvgClick(event) {
      const { onBgClick } = this.props;
      //d3 zoom behavior will preventDefault
      //click on svg also happen during brushing(but we already stop propagation in ZoomBrushBase)
      if (!event.defaultPrevented) {
        //TODO: sometimes a quick drag will also trigger a svg click
        this.setState({
          selectedNodes: new Set(),
          focusedNode: null,
          focusedLink: null,
        });
        this.props.onCleanFocus();
      }
    }

    // force helpers
    getSelectedForceNodes() {
      return this.force.nodes().filter(fnode => 
        this.state.selectedNodes.has(getNodeKey(fnode))
      );
    }

    onForceMoveStart(selectedForceNodes) {
      selectedForceNodes
        .forEach(fnode=>fnode.fixed = true);
    }

    onForceMoveEnd(selectedForceNodes) {
      selectedForceNodes
        .forEach(fnode=>fnode.fixed &= ~6);
    }

    // drag behavior
    onNodeDragStart(event) {
      event.stopPropagation();
      document.addEventListener('mousemove', this.onNodeDrag, false); //native
      document.addEventListener('mouseup', this.onNodeDragEnd, false);
      
      //toggle flag used by onNodeClick to determine if it will be a drag on node
      window.nodeDragging = false;
      this.position0 = getSvgPosition(this.ZoomBrushBase.visContainer, event);
      //get force prepared for moving nodes
      this.onForceMoveStart(this.getSelectedForceNodes());
    }

    onNodeDrag(event) {
      // event.stopPropagation();
      if (!this.position0) return;
      const position1 = getSvgPosition(this.ZoomBrushBase.visContainer, event);
      const dx = position1.x - this.position0.x;
      const dy = position1.y - this.position0.y;
      this.position0 = position1;

      //force behavior
      this.getSelectedForceNodes()
        .forEach(fnode=>{
          fnode.px += dx;
          fnode.py += dy;
        });
      this.force.resume();
      window.nodeDragging = true;
    }

    onNodeDragEnd(event) {
      event.stopPropagation();
      this.position0 = null;
      //force behavior
      document.removeEventListener('mousemove', this.onNodeDrag, false); //native
      document.removeEventListener('mouseup', this.onNodeDragEnd, false);
      this.onForceMoveEnd(this.getSelectedForceNodes());
    }

    // --Key controls--

    /* rotate function */
    partialRotate(deg) {
      const selectedForceNodes = this.getSelectedForceNodes();
      this.onForceMoveStart(selectedForceNodes);
      partialRotate(selectedForceNodes, deg);
      this.force.resume();
      this.onForceMoveEnd(selectedForceNodes);
    }

    /* scale function */
    partialScale(scale) {
      const selectedForceNodes = this.getSelectedForceNodes();
      this.onForceMoveStart(selectedForceNodes);
      partialScale(selectedForceNodes, scale);
      this.force.resume();
      this.onForceMoveEnd(selectedForceNodes);
    }

    /* nudge function */
    nudge(dx, dy) {
      const selectedForceNodes = this.getSelectedForceNodes();
      this.onForceMoveStart(selectedForceNodes);
      nudge(selectedForceNodes, dx, dy);
      this.force.resume();
      this.onForceMoveEnd(selectedForceNodes);
    }

    /* toggle fix */
    toggleFixed(fixed) {
      this.getSelectedForceNodes().forEach(fnode => fnode.fixed = fixed);
      this.force.resume();
    }

    componentWillReceiveProps(nextProps) {
      //before rendering, update the force if force related props changes
      if (this.props.nodes !== nextProps.nodes || 
          this.props.links !== nextProps.links ||
          this.props.forceOptions !== nextProps.forceOptions
      ) {
        this.updateForce(nextProps);
      }
    }

    componentWillUnmount() {
      this.force.on('tick', null);
    }

    updateForce(props = this.props) {
      const {force} = this;
      const {forceOptions, nodes, links } = props;
      this.force = updateForce(force, {
        ...DEFAULT_FORCE_PROPS,
        ...forceOptions,
        nodes,
        links,
      });
    }

    //private method for updating location without going through React update
    updatePositions() {
      this.force.nodes().forEach(fnode => this.nodeInstances[getNodeKey(fnode)].updatePosition(fnode));
      this.force.links().forEach(flink => this.linkInstances[getLinkKey(flink)].updatePosition(flink));
    }

    render() {
      const {
        nodes,
        links,
        filtered,
        width,
        height,
        forceOptions,
      } = this.props;

      const { 
        selectedNodes,
        focusedNode, 
        focusedLink,
      } = this.state;
      //clean the key-instances map
      this.nodeInstances = {};
      this.linkInstances = {};
      //https://facebook.github.io/react/docs/refs-and-the-dom.html#caveats
      //https://github.com/facebook/react/issues/9328

      // build up the real React children to render(Pure! Pure! Pure!)
      // Pure means that we only extract the props related to React.PureComponent UI rendering
      const nodeElements = nodes.map(node=> {
        //extract the props required by React rendering
        // const {
        //   x, //for force
        //   y, //for force
        //   fixed, //for force
        //   ...pureNodeProps, //the actual props for rendering
        // } = node;

        const nodeKey = getNodeKey(node); //might save back to json?
        const eventHandlers = {
          onMouseDown: this.onNodeMouseDown,
          onClick: this.onNodeClick,
        };

        //just pass node instead of purNodeProps to reduce re-render due to new object 'pureNodeProps'
        return (
          <ForceNode
            key={nodeKey}
            ref={n => n && (this.nodeInstances[nodeKey] = n)}
            node={node}
            selected={!!selectedNodes && selectedNodes.has(nodeKey)}
            focused={!!focusedNode && nodeKey === getNodeKey(focusedNode)}
            filtered={!!filtered && node[filtered.attribute] === filtered.value}
            {...eventHandlers} />
        );
      });

      const linkElements = links.map(link=> {
        const linkKey = getLinkKey(link);
        const eventHandlers = {
          onClick: this.onLinkClick,
        };
        return (
          <ForceLink
            key={linkKey}
            ref={l => l && (this.linkInstances[linkKey] = l)}
            link={link}
            focused={!!focusedLink && linkKey === getLinkKey(focusedLink)} 
            {...eventHandlers} />
        );
      });

      const ZoomBrushBaseProps = {
        width,
        height,
        onBrushEnd: this.onBrushEnd,
      }
      return (
        <svg 
          className="kj-force__svg" 
          width={width} 
          height={height}
          tabIndex={1}
          onKeyDown={this.onSvgKeyDown}
          onKeyUp={this.onSvgKeyUp}
          onClick={this.onSvgClick}
        >
          <ZoomBrushBase ref={d=>this.ZoomBrushBase=d} {...ZoomBrushBaseProps}>
            <g className="kj-force__linksLayer">{linkElements}</g>
            <g className="kj-force__nodesLayer">{nodeElements}</g>
          </ZoomBrushBase>
        </svg>
      );

    }
  }
}
