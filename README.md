<div align="center">A web-based graphics library.</div>
<div align="center">
    <em><strong>Similar & inspired by <a href="https://github.com/floooh/sokol">Sokol</a></strong></em>
</div>

# ēkara

###### Meaning eagle in Te Reo.

## About

ēkara is a graphics library designed similar to [Sokol](https://github.com/floooh/sokol). This library is designed to target WebGL2 and WebGPU.
Written in Typescript for strong type support and suggestions.
Shaders are cross compiled between GLSL to WGSL to write once and use anywhere.

### IMPORTANT NOTE

Currently ēkara only supports WebGL2. While, I have started work on WebGPU support, using the auto or webgpu backend when creating the device will result in nothing working.
