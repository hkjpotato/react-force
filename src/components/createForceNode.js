import React from 'react';

// HOC for creating force Node
export default function createForceNode (WrappedComponent) {
  return class extends React.PureComponent {
    static get defaultProps() {
      return {
        onMouseDown() {},
        onClick() {},
        focused: false,
        selected: false,
        filtered: false
      }
    }

    constructor(props) {
      super(props);
      this.domRef = this.domRef.bind(this);
      this.onClick = this.onClick.bind(this);
    }

    componentDidMount() {
      // notice this is native listener, not react event
      // because we want to fire mousedown event before the zoomstart(d3 event),  notice React event happen after native event!
      // If we convert ZoomBrushBase into React, this problem will be solved
      this.dom.addEventListener('mousedown', event => {
        event.stopPropagation(); //prevent zoom behavior
        this.props.onMouseDown(event, this.props.node);
      });
    }

    domRef(dom) {
      this.dom = dom;
    }

    updatePosition({x, y}) {
      // findDOMNode?..not sure, the react guide is still working on it
      this.dom.setAttribute('transform', `translate(${x},${y})`);
    }

    onClick(event) {
      this.props.onClick(event, this.props.node);
    }
    render() {
      const {onMouseDown, onClick, ...passThroughProps} = this.props;
      const injectedProp = {
        domRef: this.domRef,
        onClick: this.onClick,
      }
      return (<WrappedComponent {...injectedProp} {...passThroughProps} />);
    }
  }
}