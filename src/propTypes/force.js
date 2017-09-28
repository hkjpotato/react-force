import { PropTypes } from 'react';

export const DEFAULT_FORCE_PROPS = {
  gravity: 0.1,
  friction: 0.9,
  charge: -30,
  linkDistance: 20,
  linkStrength: 1,
  theta: 0.8,
  size: [960, 600]
};
export default PropTypes.shape({
  gravity: PropTypes.number, // True, maybe
  friction: PropTypes.number,
  charge: PropTypes.number,
  linkDistance: PropTypes.number,
  linkStrength: PropTypes.number,
  theta: PropTypes.number,
  size: PropTypes.array,
});
