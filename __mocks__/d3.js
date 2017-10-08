const TEST_TICK_INTERVAL = 0.01;

// need to manual mock d3 force layout here to get rid of its timer
export function createMockForceLayout() {
  return {
    'val': 'hkj mock d3'
  }
}