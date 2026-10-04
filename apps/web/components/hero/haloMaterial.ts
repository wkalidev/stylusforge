import { AdditiveBlending, Color, ShaderMaterial } from 'three';

/** A soft radial glow drawn behind the ingot: the heat it gives off, without a post-processing pass. */
export function createHaloMaterial() {
  return new ShaderMaterial({
    uniforms: {
      uColor: { value: new Color('#ff7a1a') },
      uIntensity: { value: 0.55 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uIntensity;
      varying vec2 vUv;
      void main() {
        float d = length(vUv - 0.5) * 2.0;
        float glow = pow(max(1.0 - d, 0.0), 2.4) * uIntensity;
        gl_FragColor = vec4(uColor * glow, glow);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
}
