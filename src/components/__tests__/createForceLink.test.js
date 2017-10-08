import React from 'react';
import ReactDOM from 'react-dom';
import { shallow, mount } from 'enzyme';

import createForceLink from '../createForceLink';

const defaultProps = {
  link: {
    source: 'a',
    target: 'b',
  }
};

const Link = ({
  link,
  domRef,
  selected,
  focused,
  filtered,
  ...spreadable
}) => (<line ref={domRef} {...spreadable} ></line>);

const ForceLink = createForceLink(Link);


describe('createForceLink', () => {
  it('should render a Link', () => {
    const wrapper = shallow(<ForceLink {...defaultProps} />);
    expect(wrapper.matchesElement(<Link />)).toEqual(true);
  });

  it('should get dom node when mounted', () => {
    const wrapper = mount(<ForceLink {...defaultProps} />);
    expect(ReactDOM.findDOMNode(wrapper.instance()))
      .toBe(wrapper.instance().dom);
  });

  it('should bind onClick with link props', () => {
    const mockClickCallback = jest.fn();
    const link = {
      source: 'n1',
      target: 'n2'
    }
    const wrapper = shallow(
      <ForceLink
        {...defaultProps}
        link = {link}
        onClick={mockClickCallback} />
    );
    wrapper.simulate('click');
    expect(mockClickCallback.mock.calls[0][1]).toBe(link);
  });

  it('updatePosition should be able to update dom property', () => {
    // https://github.com/airbnb/enzyme/issues/634
    // it seems I am violating the test purpose of a React component? should never test the rendered html
    const position = {
      source: {
        x: 1,
        y: 2,
      },
      target: {
        x: 3,
        y: 4
      }
    };

    const wrapper = mount(<ForceLink {...defaultProps} />);
    wrapper.instance().updatePosition(position);
    const lineHTML = wrapper.html();
    expect(lineHTML.indexOf('x1="1"')).not.toEqual(-1)
    expect(lineHTML.indexOf('y1="2"')).not.toEqual(-1)
    expect(lineHTML.indexOf('x2="3"')).not.toEqual(-1)
    expect(lineHTML.indexOf('y2="4"')).not.toEqual(-1)
  });
});