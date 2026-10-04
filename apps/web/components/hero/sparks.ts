import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, ShaderMaterial } from 'three';

/**
 * Sparks rising from the ingot. Every particle's path is computed on the GPU from its seed and
 * the time, so animating them costs one uniform update per frame.
 */
export function createSparksGeometry(count: number) {
  const geometry = new BufferGeometry();
  // Positions are unused (the vertex shader places each spark) but three needs the attribute.
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3));
  const seeds = new Float32Array(count * 4);
  for (let i = 0; i < seeds.length; i += 1) {
    seeds[i] = Math.random();
  }
  geometry.setAttribute('aSeed', new BufferAttribute(seeds, 4));
  return geometry;
}

const vertexShader = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
attribute vec4 aSeed;
varying float vLife;
void main() {
  float speed = 0.16 + aSeed.x * 0.22;
  float life = fract(uTime * speed + aSeed.y);
  float angle = aSeed.z * 6.2831853 + life * (1.5 + aSeed.w);
  float radius = 0.35 + aSeed.w * 1.05 + life * 0.45;
  vec3 position = vec3(cos(angle) * radius, -0.25 + life * 2.4 + aSeed.x * 0.2, sin(angle) * radius * 0.55);
  vLife = life;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = (1.0 - life) * (16.0 + aSeed.x * 20.0) * uPixelRatio / -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;

const fragmentShader = /* glsl */ `
uniform vec3 uHot;
uniform vec3 uCool;
varying float vLife;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float core = smoothstep(0.5, 0.0, d);
  vec3 color = mix(uHot, uCool, vLife);
  gl_FragColor = vec4(color * core, core * pow(1.0 - vLife, 1.4));
  #include <colorspace_fragment>
}
`;

export function createSparksMaterial(pixelRatio: number) {
  return new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: pixelRatio },
      uHot: { value: new Color('#ffe2a0') },
      uCool: { value: new Color('#d9411e') },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
}
