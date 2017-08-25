import React from 'react';
import ReactDOM from 'react-dom';
import d3 from 'd3';

const c20 = d3.scale.category20();

//use the HOC to create the container components
import createInteractiveForce from './components/createInteractiveForce';
import createForceNode from './components/createForceNode';
import createForceLink from './components/createForceLink';


//Your presentational components
//A node will receives props {node, selected, filtered, focused, domRef, ...injectedCallbacks}
class Node extends React.PureComponent {
  render() {
    const {node, domRef, selected, filtered, focused, ...eventHandlers} = this.props;
    return (
      <g 
        ref={domRef} 
        {...eventHandlers} 
        style={{
          cursor: 'pointer'
        }}
      >
        <circle 
          r={4} 
          cx={0} 
          cy={0} 
          fill={c20(node.group)}
          strokeWidth={1}
          stroke={selected ? '#555' : '#fff'}
        >
        </circle>
        {
          filtered || focused ? 
          (
            <circle 
              className="highlighted-ring"
              r={8}
              cx={0}
              cy={0}
              style={{
                pointerEvents: 'none',
                fill: 'none',
                strokeWidth: focused ? 1.5 : 0.8,
                stroke: focused ? '#000' : c20(node.group),
              }} />
          ) : null
        }
      </g>
    )
  }
}

//A link will receives props {node, selected, filtered, domRef, ...injectedCallbacks}
class Link extends React.PureComponent {
  render() {
    const {link, domRef, filtered, focused, ...spreadable} = this.props;
    return (
      <line 
        ref={domRef} 
        {...spreadable} 
        style={{
          stroke: '#999',
          strokeWidth: focused ? 3 : 1.5,
          cursor: 'pointer'
        }}
      >
      </line>
    );
  }
}

const ForceNode = createForceNode(Node);
const ForceLink = createForceLink(Link);
const ForceGraph = createInteractiveForce(ForceNode, ForceLink);

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      width: 960,
      height: 500,
      nodes: [],
      links: [],
      forceOptions: {
        gravity: 0.1,
        friction: 0.9,
        charge: -50,
        linkDistance: 20,
        linkStrength: 1,
        theta: 0.8,
        size: [960, 600]
      },
      focus: null,
      group: 'N/A',
    }
  }

  componentDidMount() {
    d3.json('/data.json', (data) => {
      this.setState({
        nodes: data.nodes,
        links: data.links,
      })
    })
  }

  onGroupChange(group) {
    this.setState({
      group: +group
    });
  }

  logSelected() {
    //you can get the selected nodes location using the API methods from ForceGraph instance
    const selected = [...this.forcegraph.getSelectedNodes()]
    console.log(JSON.stringify(selected, null, 2));
  }

  logAllNodePositions() {
    const positions = this.state.nodes.reduce((pos, node) => {
      const {x, y} = this.forcegraph.getPosition(node.name);
      pos[node.name] = {x, y};
      return pos;
    }, {});
    console.log(JSON.stringify(positions, null, 2));
  }
  addAtCentroid() {
    this.setState({
      nodes: [
        ...this.state.nodes, 
        {
          name: 'random' + this.state.nodes.length,
          group: 14,
          //you can preset the x and y (even fixed) to the nodes
          x: this.state.width / 2,
          y: this.state.height / 2,
        }
      ]
    });
  }
  render() {
    const { 
      width, 
      height,
      nodes, 
      group, 
      links, 
      forceOptions, 
      focus
    } = this.state;
    return (
      <div>
        <PopUp
          focus={focus}
          group={group}
          onGroupChange={(group) => this.onGroupChange(group)} 
          logSelected={() => this.logSelected()}
          logAllNodePositions={() => this.logAllNodePositions()}
          addAtCentroid={() => this.addAtCentroid()} />
        <ForceGraph
          ref={ins => this.forcegraph = ins}
          filtered={{
            attribute: 'group',
            value: group
          }}
          width={width}
          height={height}
          nodes={nodes}
          links={links}
          forceOptions={forceOptions}
          onNodeFocus={(event, node) => this.setState({focus: node})}
          onLinkFocus={(event, link) => this.setState({focus: link})}
          onCleanFocus={() => {this.setState({focus: null})}}
        />
      </div>
    )
  }
}

function PopUp({focus, group, onGroupChange, logSelected, logAllNodePositions, addAtCentroid}) {
  return (
    <div style={{
      position: 'absolute',
      left: 10,
      top: 10,
      border: '1px solid #ccc',
      borderRadius: 2,
      padding: 5,
      width: 180,
      // height: 100,
    }}>
      <SelectGroup
        group={group}
        onGroupChange={onGroupChange} />
      <button 
        className="btn"
        onClick={logSelected}>
        log selected
      </button>
      <button 
        className="btn"
        onClick={logAllNodePositions}>
        log all positions
      </button>
      <button 
        className="btn"
        onClick={addAtCentroid}>
        add at centroid
      </button>
      <div className='btn' style={{marginTop: 10}}>
        <label>Focus:&nbsp;</label>
        {JSON.stringify(focus, null, 2)}
      </div>
    </div>
  )
}
function SelectGroup({group, onGroupChange}) {
  const options = ['N/A', 0, 1, 2, 3, 4, 5, 6].map(group => ( 
    <option key={group} value={group}>{group}</option>
  ));
  return (
    <div className="btn">
      <label htmlFor="node-group">filter group</label>
      &nbsp;&nbsp;
      <select 
        id={"node-group"}
        onChange={(e) => onGroupChange(e.target.value)} 
        value={group}>
        {options}
      </select>
    </div>
  )
}

ReactDOM.render(<App />, document.getElementById('root'));
