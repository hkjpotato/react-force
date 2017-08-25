import ReactDOM from 'react-dom';
import React, { PropTypes } from 'react';

export default class ZoomBrushBase extends React.PureComponent {
  static get propTypes() {
    return {
      width: PropTypes.number.isRequired,
      height: PropTypes.number.isRequired,
      onBrushStart: PropTypes.func.isRequired,
      onBrushEnd: PropTypes.func.isRequired,
      onZoomStart: PropTypes.func,
      onZoom: PropTypes.func,
      onZoomEnd: PropTypes.func,
    };
  }

  static get defaultProps() {
    return {
      onBrushStart: ()=>{},
      onBrushEnd: ()=>{}
    }
  }

  constructor(props) {
    super(props);
    this.state = {
      translate: [0, 0],
      scale: 1,
      zoomable: true,
    }

    const {width, height} = this.props;
    /*---Scale---*/
    const xScale = d3.scale.linear()
    .domain([0,width]).range([0,width]);
    const yScale = d3.scale.linear()
    .domain([0,height]).range([0, height]);
    this.xScale = xScale;
    this.yScale = yScale;

    this.onZoom = this.onZoom.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onClick = this.onClick.bind(this);

  }
  componentDidMount() {
    const {xScale, yScale} = this;
    /*---zoomer---*/
    this.zoomer = d3.behavior.zoom()
      .scaleExtent([0.1, 10])
      .x(xScale)
      .y(yScale)
      .on("zoomstart", function() {
        // console.log('zoomstart', d3.event);
      })
      .on("zoom", () => {
        // console.log('zoom', d3.event);
        this.onZoom(d3.event);
      });

    /*---brusher---*/
    const _self = this;
    this.brusher = d3.svg.brush()
      .x(xScale)
      .y(yScale)
      .on('brushstart', ()=> {
        //d3 event always goes first!
        // console.log('brushstart');
        this.props.onBrushStart();
      })
      .on('brush', () => {
        //use d3 to get the extent
        // let extent = d3.event.target.extent();
        // this.props.onBrush(extent);
      })
      .on('brushend', function() {
        let extent = d3.event.target.extent();
        _self.props.onBrushEnd(extent);
        d3.event.target.clear();
        d3.select(this).call(d3.event.target);
      });

    //active brusher and set its style(out of React Control)
    let d3brush = d3.select(this.brush)
      .call(this.brusher)

    d3brush.select('.background')
      .style('visibility', 'visible')
      .style('fill-opacity', 0.1)
      .style('fill', 'yellow')
      .style('shape-rendering', 'crispEdges');

    d3brush.select('.extent')
      .style('fill-opacity', 0.1)
      .style('stroke', '#fff;')
      .style('shape-rendering', 'crispEdges');

    //update State Based on Props
    this.updateZoomBrushStatus(this.state);
  }
  updateZoomBrushStatus(state=this.state) {
    const { zoomable } = state;

    // bind and unbind d3 event for zoom, as for brush, it will be controlled by react style rendering
    if (zoomable) {
      d3.select(this.zoomBase).call(this.zoomer)
        .on('dblclick.zoom', null);
    } else {
      //https://www.npmjs.com/package/react-native-listener
      //cant't relies on d3 click because a d3 click on parent happens before a react click on child
      //and thus stopPropagation on child's react click will not stop the parent's d3 click
      d3.select(this.zoomBase)
        // .on('click.svg_clean', ()=>{
        //   console.log('zoomBase click');
        //   // console.log('zoomBase detect a click');
        //   // d3.event.preventDefault();
        // }, false)
        .on("mousedown.zoom", null)
        .on("touchstart.zoom", null)
        .on("touchmove.zoom", null)
        .on("touchend.zoom", null);
    }
  }
  onZoom(d3event) {
    this.setState({
      translate: d3event.translate,
      scale: d3event.scale
    });
  }
  onKeyDown(e) {
    // console.log('zoombrush keydown', this);
    e.preventDefault();
    //https://facebook.github.io/react/docs/react-component.html#setstate
    //use a callback of setState to ensure the async setState is finished
    //orginally updateZoomBrushStatus is placed in componentDidUpdate which will be
    //called even that's just a props change, bad performance
    if(e.shiftKey) {
      this.setState({
        zoomable: false
      }, this.updateZoomBrushStatus);
    }
  }
  onKeyUp(e) {
    // console.log('zoombrush keyup');
    e.preventDefault();
    if (!this.state.zoomable) {
      this.setState({
        zoomable: true
      }, this.updateZoomBrushStatus);
    }
  }
  onClick(e) {
    //https://www.npmjs.com/package/react-native-listener
    if (!this.state.zoomable) {
      //during brushing, stopPropagtion to prevent parent's svg click
      e.stopPropagation();
    }
    //for zoomable, we dont stopPropagation because we want to allow click on parent svg do the clean function
  }
  render() {
    const { translate, scale } = this.state;
    return (
      <g 
        className="zoomBase" 
        ref={c=>{this.zoomBase = c}} 
        onClick={this.onClick}
        tabIndex={1}
        onKeyDown={this.onKeyDown}
        onKeyUp={this.onKeyUp}
      >
        <rect 
          className="events-catcher"
          width={this.props.width} 
          height={this.props.height}
          style={{
            fill: 'none',
            pointerEvents: 'all'
          }}
        ></rect>
        <g 
          ref={c=>this.brush=c}
          className="brush" 
          style={{display: this.state.zoomable ? 'none' : 'inline'}}/>
        <g 
          ref={c=>this.visContainer = c} 
          className="visContainer"
          transform={`translate(${translate})scale(${scale})`}
          >
          {this.props.children}
        </g>
      </g>
    )
  }
}