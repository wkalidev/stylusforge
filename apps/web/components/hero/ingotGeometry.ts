import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/**
 * A cast ingot, built procedurally: a rounded box whose upper half narrows towards a smaller
 * top face, like metal poured into a tapered mould. No model file is loaded.
 */
export function createIngotGeometry({
  width = 2.4,
  height = 0.78,
  depth = 1.15,
  radius = 0.12,
  topScale = 0.74,
  segments = 6,
} = {}) {
  const geometry = new RoundedBoxGeometry(width, height, depth, segments, radius);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i += 1) {
    const y = position.getY(i);
    // 0 at the bottom face, 1 at the top face: shrink x and z linearly with height.
    const t = (y + height / 2) / height;
    const scale = 1 - (1 - topScale) * t;
    position.setX(i, position.getX(i) * scale);
    position.setZ(i, position.getZ(i) * scale);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}
