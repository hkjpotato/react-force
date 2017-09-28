import React from 'react';
// HOC for creating force link
export default function createForceLink (WrappedComponent) {
  return class extends React.PureComponent {
    static get defaultProps() {
      return {
        onClick() {},
        focused: false,
        filtered: false
      }
    }

    constructor(props) {
      super(props);
      this.domRef = this.domRef.bind(this);
      this.onClick = this.onClick.bind(this);
    }

    updatePosition({source : {x : x1, y : y1}, target: {x: x2, y: y2}}) {
      // findDOMNode?..not sure, the react guide is still working on it
      this.dom.setAttribute('x1', x1);
      this.dom.setAttribute('y1', y1);
      this.dom.setAttribute('x2', x2);
      this.dom.setAttribute('y2', y2);
    }

    domRef(dom) {
      this.dom = dom;
    }

    onClick(event) {
      this.props.onClick(event, this.props.link);
    }

    render() {
      const {onClick, ...passThroughProps} = this.props;
      const injectedProp = {
        domRef: this.domRef,
        onClick: this.onClick,
      }
      return (<WrappedComponent {...injectedProp} {...passThroughProps} />);
    }
  }
}
