import React from 'react';
import ReactDOM from 'react-dom';
import { shallow, mount } from 'enzyme';

import createForceNode from '../createForceNode';

const defaultProps = {
  node: {
    name: 'hkj'
  }
};

const Node = ({
  node,
  domRef,
  selected,
  focused,
  filtered,
  ...spreadable
}) => (<g ref={domRef} {...spreadable} ></g>);

const ForceNode = createForceNode(Node);

describe('createForceNode', () => {
  it('should render a Node', () => {
    const wrapper = shallow(<ForceNode {...defaultProps} />);
    expect(wrapper.matchesElement(<Node />)).toEqual(true);
  });

  it('should get dom node when mounted', () => {
    const wrapper = mount(<ForceNode {...defaultProps} />);
    expect(ReactDOM.findDOMNode(wrapper.instance()))
      .toBe(wrapper.instance().dom);
  });

  it('should bind onClick with link props', () => {
    const mockClickCallback = jest.fn();
    const node = {}
    const wrapper = shallow(
      <ForceNode
        {...defaultProps}
        node = {node}
        onClick={mockClickCallback} />
    );
    wrapper.simulate('click');
    expect(mockClickCallback.mock.calls[0][1]).toBe(node);
  });

  it('updatePosition should be able to update dom property', () => {
    // https://github.com/airbnb/enzyme/issues/634
    // it seems I am violating the test purpose of a React component? should never test the rendered html
    const position = {x: 1, y: 2};

    const wrapper = mount(<ForceNode {...defaultProps} />);
    wrapper.instance().updatePosition(position);
    const nodeHTML = wrapper.html();
    // dam...
    expect(nodeHTML.indexOf('transform="translate(1,2)"')).not.toBe(-1)
  });
});