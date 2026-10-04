import { Color, ShaderMaterial } from 'three';

/** 3D simplex noise (Ashima Arts / Stefan Gustavson, MIT licence). */
const SIMPLEX_NOISE = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
`;

const vertexShader = /* glsl */ `
varying vec3 vNormal;
varying vec3 vViewDir;
varying vec3 vLocal;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vNormal = normalize(mat3(modelMatrix) * normal);
  vViewDir = normalize(cameraPosition - world.xyz);
  vLocal = position;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const fragmentShader = /* glsl */ `
uniform float uTime;
uniform vec3 uCrust;
uniform vec3 uMolten;
uniform vec3 uAmber;
varying vec3 vNormal;
varying vec3 vViewDir;
varying vec3 vLocal;
${SIMPLEX_NOISE}
void main() {
  vec3 n = normalize(vNormal);
  // Rim light: the core shows through where the surface turns away from the eye.
  float fresnel = pow(1.0 - max(dot(n, normalize(vViewDir)), 0.0), 2.2);

  // Heat flowing slowly under the surface: mostly cooled crust, with hotter pockets.
  vec3 p = vLocal * 1.5 + vec3(0.0, -uTime * 0.1, uTime * 0.04);
  float heat = 0.5 + 0.5 * (0.65 * snoise(p) + 0.35 * snoise(p * 2.3 + 7.0));

  // Cracks in the crust: ridged noise at two scales, thin and sharp, brightest where it is hot.
  vec3 q = vLocal * 3.2 + vec3(0.0, uTime * 0.03, 0.0);
  float crack = max(
    1.0 - smoothstep(0.0, 0.045, abs(snoise(q))),
    0.6 * (1.0 - smoothstep(0.0, 0.03, abs(snoise(q * 2.1 + 3.0))))
  );
  crack *= smoothstep(0.25, 0.7, heat);

  vec3 color = mix(uCrust, uMolten, smoothstep(0.55, 0.95, heat) * 0.85);
  color = mix(color, uAmber, crack);
  // The core shows through at grazing angles: molten at the rim, amber at the very edge.
  color += mix(uMolten, uAmber, fresnel) * pow(fresnel, 1.3) * 1.4;
  color *= 0.92 + 0.08 * sin(uTime * 1.2);

  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

/** Hot metal that glows from inside: animated heat, cracks in the crust, a molten rim. */
export function createMoltenMaterial() {
  return new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uCrust: { value: new Color('#2a0d06') },
      uMolten: { value: new Color('#ff6a10') },
      uAmber: { value: new Color('#ffd27a') },
    },
    vertexShader,
    fragmentShader,
  });
}
