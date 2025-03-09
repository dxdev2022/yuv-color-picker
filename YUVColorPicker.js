class YUVColorPicker {
  constructor(options = {}) {
    this.container = options.container || document.body;
    this.shadow = this.container.attachShadow({ mode: 'open' });
    

    this.ignore_different_grayscale = options.ignore_different_grayscale;
    this.different_grayscale_tolerance = options.different_grayscale_tolerance || 1e-3;
    // this.isDown = false;
    // this.currTarget = null;
    // this.c_uv, d_y, c_u, c_v, d_a;

    this.canvas_width = options.canvas_width || 300;
    this.canvas_height = options.canvas_height || 150;
    // // this.canvasWidth = 200; 
    // // this.canvasHeight = 120;
    this.color_component_height = options.color_component_height || 10;



    

    this.wrapper_background_color = options.wrapper_background_color || 'none';
    this.wrapper_padding = options.wrapper_padding || 0;
    
    this.yuv_y = options.yuv_y || 128;
    this.yuv_u = options.yuv_u || 93,
    this.yuv_v = options.yuv_v || 200;
    this.a = options.a || 180; 

    this.rgb_r = 0; 
    this.rgb_g = 0; 
    this.rgb_b = 0;

    this.show_info = options.show_info;
    
    this.yuv_to_rgb(this.yuv_y, this.yuv_u, this.yuv_v); //rgb_r，rgb_g，rgb_b will be set here

    
    this.init();
    
    this.updateValues();
  }

  init() {
    this.createDOM();
    this.injectStyles();
    this.initWebGPU();
    this.bindEvents();
    //this.setupDefaults();
  }

  createDOM() {
    this.wrapper = document.createElement('div');
    this.wrapper.id = 'wrapper';
    this.wrapper.innerHTML = `
      <div id="uv_wrapper">
        <div id="c_uv_picker"></div>
        <canvas id="c_uv"></canvas>
      </div>
      <div id="y_wrapper">
        <div id="d_y"></div>
        <div id="d_y_picker"></div>
      </div>
      <div id="u_wrapper">
        <div id="c_u_picker"></div>
        <canvas id="c_u"></canvas>
      </div>
      <div id="v_wrapper">
        <div id="c_v_picker"></div>
        <canvas id="c_v"></canvas>
      </div>
      <div id="a_wrapper">
        <div id="d_a_bg"></div>
        <div id="d_a"></div>
        <div id="d_a_picker"></div>
      </div>
      <div id="info">
        <div>
        <span id="span_yuv"></span>
        <input type="checkbox" id="show_all_checkbox">
        <label for="show_all_checkbox">Ignore Different Grayscale</label>
        </div>
        <div>
        <span id="span_rgb"></span>
        <div id="span_rgb_display"></div>
        <div id="span_rgb_display_alpha_wrapper">
          <div id="span_rgb_display_alpha_bg"></div>
          <div id="span_rgb_display_alpha"></div>
        </div>
        </div>
      </div>
    `;
    this.shadow.appendChild(this.wrapper);
  }

  injectStyles() {
    const style = document.createElement('style');
    //console.log("this.canvasWidth", this.canvas_width);
    style.textContent = `
      canvas { display: block; width: 100%; height: 100% }
      #wrapper { background: ${this.wrapper_background_color}; padding: ${this.wrapper_padding}px; width: ${this.canvas_width}px }
      #uv_wrapper{
        border: 1px solid #000; position: relative; overflow: hidden;
        height: ${this.canvas_height}px
      }

      #y_wrapper, #u_wrapper, #v_wrapper, #a_wrapper {
       border-left: 1px black solid; border-right: 1px black solid; border-bottom: 1px black solid; position: relative; overflow: hidden; 
        height: ${this.color_component_height}px

      }
      #c_uv_picker{
        width: 10px; height: 10px; border: 2px solid rgba(255,255,255,0.7);
        outline: 1px solid rgba(0, 0, 0, 0.4); 
        transform: translate(-7px, -7px);
        border-radius: 50%; position: absolute; pointer-events: none
      }

      #d_y_picker, #c_u_picker, #c_v_picker, #d_a_picker {
        width: ${this.color_component_height - 4}px; height:${this.color_component_height - 4}px; border: 2px solid rgba(255,255,255,0.7);
        transform: translate(-${this.color_component_height/2}px, 0px);
        outline: 1px solid rgba(0, 0, 0, 0.4); border-radius: 50%; position: absolute; pointer-events: none;
        top:0%;
      }

      #d_y{
        position:absolute; height: ${this.color_component_height}px; width:100%; top:0px; background: linear-gradient(to right, rgba(0, 0, 0, 1), rgba(255, 255, 255, 1)); user-select: none;
      }

      #d_a_bg{
        height: ${this.color_component_height}px; background-image:linear-gradient(45deg, #808080 25%, transparent 25%), linear-gradient(-45deg, #808080 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #808080 75%), linear-gradient(-45deg, transparent 75%, #808080 75%); background-position:0 0, 0 5px, 5px -5px, -5px 0px; background-size: 10px 10px; user-select: none;
      }

      #d_a{
        position:absolute; height: ${this.color_component_height}px; width:100%; top:0px; background: linear-gradient(to right, rgba(0, 0, 0, 0), rgba(255, 0, 0, 1)); user-select: none;
      }

      #info{
        width: 100%; height: 40px; margin: 5px 0px; font-size:12px; display: ${this.show_info?"block":"none"};
      }

      #show_all_checkbox{
        margin-left:16px;
        vertical-align: middle;
      }

      #span_rgb{
        float:left;
      }

      #span_rgb_display{
        display:block; float:left; margin-top:2px; margin-left:16px;  width: 10px; height: 10px; background-color: rgba(0, 0, 0, 1); border: 1px solid black;
      }

      #span_rgb_display_alpha_wrapper{
        display:block; float:left; margin-top:2px;  margin-left:10px;  position:relative;
      }
      #span_rgb_display_alpha_bg{
        width: 10px; height: 10px; background-image:linear-gradient(45deg, #808080 25%, transparent 25%), linear-gradient(-45deg, #808080 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #808080 75%), linear-gradient(-45deg, transparent 75%, #808080 75%); background-position:0 0, 0 5px, 5px -5px, -5px 0px; background-size: 10px 10px; border: 1px solid black; user-select: none;
      }

      #span_rgb_display_alpha{
        position: absolute; top:0px; width:10px; height:10px; background-color: rgba(131, 76, 76, 0.582); border: 1px solid black;
      }
    `;
    this.shadow.appendChild(style);
  }

  async initWebGPU() {
    this.adapter = await navigator.gpu?.requestAdapter();
    this.device = await this.adapter?.requestDevice();

    if (!this.device) {
      console.error('WebGPU not supported');
      return;
    }

    //this.configureCanvases();

    const uniformBufferSize_uv = 3 * 4; //three f32 values
    const uniformBuffer_uv = this.device.createBuffer({
      label: 'uniforms for triangle uv',
      size: uniformBufferSize_uv,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const uniformValues_uv = new Float32Array(uniformBufferSize_uv / 4);



    const uniformBufferSize_u = 4 * 4;//four f32 values
    const uniformBuffer_u = this.device.createBuffer({
      label: 'uniforms for triangle u',
      size: uniformBufferSize_u,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const uniformValues_u = new Float32Array(uniformBufferSize_u / 4);


    const uniformBufferSize_v = 4 * 4; //four f32 values
    const uniformBuffer_v = this.device.createBuffer({
      label: 'uniforms for triangle v',
      size: uniformBufferSize_v,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const uniformValues_v = new Float32Array(uniformBufferSize_v / 4);

    //console.log("uv_shader_code", uv_shader_code);

    this.canvases = {
      c_uv: this.configureCanvas('c_uv', uv_shader_code, uniformBuffer_uv, uniformValues_uv),
      c_u: this.configureCanvas('c_u', u_shader_code, uniformBuffer_u, uniformValues_u),
      c_v: this.configureCanvas('c_v', v_shader_code, uniformBuffer_v, uniformValues_v),
    };

    this.updateCanvas();


    //------------avoid blurring on other sizes of the canvases----------
    this.observer.observe(this.shadow.getElementById('c_uv'));
    this.observer.observe(this.shadow.getElementById('c_u'));
    this.observer.observe(this.shadow.getElementById('c_v'));
    //------------------------------------------------------------
  }



  configureCanvas(id, shaderCode, uniformBuffer, uniformValues) {
    const canvas = this.shadow.getElementById(id);
    const context = canvas.getContext('webgpu');
    const format = navigator.gpu.getPreferredCanvasFormat();

    context.configure({ device: this.device, format });

    // 创建着色器模块
    const module = this.device.createShaderModule({
      code: /* wgsl */ `
            ${shaderCode}
          `,
    });

    const pipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: { module },
      fragment: {
        module,
        targets: [{ format }]
      },
      primitive: { topology: "triangle-strip" }
    });

    return {
      context,
      pipeline,
      uniformBuffer,
      uniformValues,
      bindGroup: this.device.createBindGroup({
        label: id + ' triangle bind group',
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: uniformBuffer } },
        ],
      }),
    };


  }



  renderCanvas(canvasConfig) {
    //console.log("canvasConfig",canvasConfig);
    const renderPassDescriptor = {
      colorAttachments: [{
        view: canvasConfig.context.getCurrentTexture().createView(),
        clearValue: [0.3, 0.3, 0.3, 1],
        loadOp: 'clear',
        storeOp: 'store',
      }],
    };

    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(canvasConfig.pipeline);
    pass.setBindGroup(0, canvasConfig.bindGroup);
    pass.draw(4);
    pass.end();

    this.device.queue.submit([encoder.finish()]);
  }

  //## Acknowledgements
  //Part of this code is derived from [svelte-color-picker] ([https://github.com/efeskucuk/svelte-color-picker]) by [efeskucuk], used under the MIT License.
  bindEvents() {
   

    document.addEventListener("mouseup", this.handleMouseUp);
    document.addEventListener("mousemove", this.handleMouseMove);

    
    this.c_uv_picker = this.shadow.getElementById("c_uv_picker");
    this.c_uv = this.shadow.getElementById("c_uv"); //canvas uv;

    this.d_y_picker = this.shadow.getElementById("d_y_picker");
    this.d_y = this.shadow.getElementById("d_y"); //canvas y;

    this.c_u_picker = this.shadow.getElementById("c_u_picker");
    this.c_u = this.shadow.getElementById("c_u"); //canvas u;
    

    this.c_v_picker = this.shadow.getElementById("c_v_picker");
    this.c_v = this.shadow.getElementById("c_v"); //canvas v;
    

    this.d_a_picker = this.shadow.getElementById("d_a_picker");
    this.d_a = this.shadow.getElementById("d_a"); //div a;
    


    
    
    this.c_uv.addEventListener('mousedown', this.handleMouseDown);
    this.d_y.addEventListener('mousedown', this.handleMouseDown);
    this.c_u.addEventListener('mousedown', this.handleMouseDown);
    this.c_v.addEventListener('mousedown', this.handleMouseDown);
    this.d_a.addEventListener('mousedown', this.handleMouseDown);

    
    // this.shadow.getElementById('c_uv').addEventListener('mousedown', this.handleMouseDown);
    // this.shadow.getElementById('d_y').addEventListener('mousedown', this.handleMouseDown);
    // this.shadow.getElementById('c_u').addEventListener('mousedown', this.handleMouseDown);
    // this.shadow.getElementById('c_v').addEventListener('mousedown', this.handleMouseDown);
    // this.shadow.getElementById('d_a').addEventListener('mousedown', this.handleMouseDown);
    // this.shadow.getElementById('show_all_checkbox').addEventListener('change', this.handleCheckbox);

    this.c_uv_picker.style.top = (this.yuv_v / 255 * 100).toFixed(2) + "%";
    this.c_uv_picker.style.left = (this.yuv_u / 255 * 100).toFixed(2) + "%";

    this.c_u_picker.style.left = (this.yuv_u / 255 * 100).toFixed(2) + "%";
    this.c_v_picker.style.left = (this.yuv_v / 255 * 100).toFixed(2) + "%";
    
    this.d_y_picker.style.left = (this.yuv_y / 255 * 100).toFixed(2) + "%";
    this.d_a_picker.style.left = (this.a / 255 * 100).toFixed(2) + "%";

    
    this.show_all_checkbox = this.shadow.getElementById("show_all_checkbox");
    this.show_all_checkbox.checked = this.ignore_different_grayscale;
    this.show_all_checkbox.addEventListener('change', this.handleCheckbox);
    
  }

  handleMouseUp = (e) => {
    //console.log("mouseUp")
    this.isDown = false;
  }

  handleMouseDown = (e) => {
    //console.log("mouseDown", e.target.id);
    this.currTarget = e.target;
    //console.log("this.currTarget", this.currTarget);

    if(this.currTarget.id == "c_uv"){
      this.isDown = true;

      let ratioX = (e.offsetX + 1) / this.canvas_width;
      let ratioY = (e.offsetY + 1) / this.canvas_height;

      let xIn255 = ratioX * 255;
      let yIn255 = ratioY * 255;

      xIn255 = Math.min(255, Math.max(0, xIn255));
      yIn255 = Math.min(255, Math.max(0, yIn255));

      xIn255 = xIn255.toFixed(2);
      yIn255 = yIn255.toFixed(2);

      this.yuv_u = xIn255;
      this.yuv_v = yIn255;

      this.c_uv_picker.style.top = (yIn255 / 255 * 100).toFixed(2) + "%";
      this.c_uv_picker.style.left = (xIn255 / 255 * 100).toFixed(2) + "%";

      this.c_u_picker.style.left = (xIn255 / 255 * 100).toFixed(2) + "%";
      this.c_v_picker.style.left = (yIn255 / 255 * 100).toFixed(2) + "%";

      this.updateCanvas();
      this.updateValues();
    }

    if (this.currTarget.id == "d_y") {
      this.isDown = true;

      let ratioX = (e.offsetX + 1) / this.canvas_width;

      let xIn255 = ratioX * 255;

      xIn255 = Math.min(255, Math.max(0, xIn255));

      xIn255 = xIn255.toFixed(2);

      this.yuv_y = xIn255;


      this.d_y_picker.style.left = (xIn255 / 255 * 100).toFixed(2) + "%";

      this.updateCanvas();
      this.updateValues();
    }

    if (this.currTarget.id == "c_u") {
      this.isDown = true;

      let ratioX = (e.offsetX + 1) / this.canvas_width;

      let xIn255 = ratioX * 255;

      xIn255 = Math.min(255, Math.max(0, xIn255));

      xIn255 = xIn255.toFixed(2);

      this.yuv_u = xIn255;

      this.c_uv_picker.style.left = (xIn255 / 255 * 100).toFixed(2) + "%";

      this.c_u_picker.style.left = (xIn255 / 255 * 100).toFixed(2) + "%";

      this.updateCanvas();
      this.updateValues();
    }

    if (this.currTarget.id == "c_v") {
      this.isDown = true;

      let ratioX = (e.offsetX + 1) / this.canvas_width;

      let xIn255 = ratioX * 255;

      xIn255 = Math.min(255, Math.max(0, xIn255));

      xIn255 = xIn255.toFixed(2);

      this.yuv_v = xIn255;

      this.c_uv_picker.style.top = (xIn255 / 255 * 100).toFixed(2) + "%";

      this.c_v_picker.style.left = (xIn255 / 255 * 100).toFixed(2) + "%";

      this.updateCanvas();
      this.updateValues();
    }

    if (this.currTarget.id == "d_a") {
      this.isDown = true;

      let ratioX = (e.offsetX + 1) / this.canvas_width;

      let xIn255 = ratioX * 255;

      xIn255 = Math.min(255, Math.max(0, xIn255));

      xIn255 = xIn255.toFixed(2);

      this.a = xIn255;

      

      this.d_a_picker.style.left = (xIn255 / 255 * 100).toFixed(2) + "%";

      this.updateCanvas();
      this.updateValues();
    }

    
  }

 
  handleMouseMove = (e) => {
    if (this.isDown) {
      

      let mouseX = e.clientX;
      let mouseY = e.clientY;


      if (this.currTarget.id == "c_uv") {
  



        let rect = this.currTarget.getBoundingClientRect();
        let ratioX = (e.clientX - rect.x) / this.canvas_width;
        let ratioY = (e.clientY - rect.y) / this.canvas_height;

        let xIn255 = Math.min(255, Math.max(0, ratioX * 255));
        let yIn255 = Math.min(255, Math.max(0, ratioY * 255));

        this.yuv_u = xIn255.toFixed(2);
        this.yuv_v = yIn255.toFixed(2);

        this.c_uv_picker.style.top = (yIn255 / 255 * 100).toFixed(2) + "%";
        this.c_uv_picker.style.left = (xIn255 / 255 * 100).toFixed(2) + "%";

        this.c_u_picker.style.left = (xIn255 / 255 * 100).toFixed(2) + "%";
        this.c_v_picker.style.left = (yIn255 / 255 * 100).toFixed(2) + "%";

        this.updateCanvas();
        this.updateValues();
      }


      if (this.currTarget.id == "d_y") {

        let rect = this.currTarget.getBoundingClientRect();
        let ratioX = (e.clientX - rect.x) / this.canvas_width;
        

        let xIn255 = ratioX * 255;

        xIn255 = Math.min(255, Math.max(0, xIn255));

        xIn255 = xIn255.toFixed(2);

        this.yuv_y = xIn255;


        this.d_y_picker.style.left = (xIn255 / 255 * 100).toFixed(2) + "%";

        this.updateCanvas();
        this.updateValues();
      }

      if (this.currTarget.id == "c_u") {

        let rect = this.currTarget.getBoundingClientRect();
        let ratioX = (e.clientX - rect.x) / this.canvas_width;
        

        let xIn255 = ratioX * 255;

        xIn255 = Math.min(255, Math.max(0, xIn255));

        xIn255 = xIn255.toFixed(2);

        this.yuv_u = xIn255;

        this.c_uv_picker.style.left = (xIn255 / 255 * 100).toFixed(2) + "%";

        this.c_u_picker.style.left = (xIn255 / 255 * 100).toFixed(2) + "%";

        this.updateCanvas();
        this.updateValues();
      }

      if (this.currTarget.id == "c_v") {

        let rect = this.currTarget.getBoundingClientRect();
        let ratioX = (e.clientX - rect.x) / this.canvas_width;
        

        let xIn255 = ratioX * 255;

        xIn255 = Math.min(255, Math.max(0, xIn255));

        xIn255 = xIn255.toFixed(2);

        this.yuv_v = xIn255;

        this.c_uv_picker.style.top = (xIn255 / 255 * 100).toFixed(2) + "%";

        this.c_v_picker.style.left = (xIn255 / 255 * 100).toFixed(2) + "%";

        this.updateCanvas();
        this.updateValues();
      }

      if (this.currTarget.id == "d_a") {

        let rect = this.currTarget.getBoundingClientRect();
        let ratioX = (e.clientX - rect.x) / this.canvas_width;
        

        let xIn255 = ratioX * 255;

        xIn255 = Math.min(255, Math.max(0, xIn255));

        xIn255 = xIn255.toFixed(2);

        this.a = xIn255;



        this.d_a_picker.style.left = (xIn255 / 255 * 100).toFixed(2) + "%";

        this.updateCanvas();
        this.updateValues();
      }

      
    }
  }

  handleCheckbox = (e) => {
    this.ignore_different_grayscale = e.target.checked ? 1 : 0;
    this.updateCanvas();
  }


  //---------------20250309 Avoid blurring，Canvas should be 100%，just set the width and height------------
  observer = new ResizeObserver(entries => {
    for (const entry of entries) {
      const canvas = entry.target;
      const width = entry.contentBoxSize[0].inlineSize;
      const height = entry.contentBoxSize[0].blockSize;
      canvas.width = Math.max(1, Math.min(width, this.device.limits.maxTextureDimension2D));
      canvas.height = Math.max(1, Math.min(height, this.device.limits.maxTextureDimension2D));
      // re-render
      //render();
      // canvases['c_uv'].uniformValues.set([0.5]);
      // device.queue.writeBuffer(canvases['c_uv'].uniformBuffer, 0, canvases['c_uv'].uniformValues);
      this.renderCanvas(this.canvases['c_uv']);
      this.renderCanvas(this.canvases['c_u']);
      this.renderCanvas(this.canvases['c_v']);
    }
  });
  
  //------------------------------------

  updateCanvas() {


    //console.log("this.canvases", this.canvases);
    // console.log("this.switch_show_all", this.hide_different_grayscale);
    //console.log("this.yuv_y", this.yuv_y);
    this.canvases['c_uv'].uniformValues.set([this.ignore_different_grayscale, this.different_grayscale_tolerance, this.yuv_y / 255]);
    this.device.queue.writeBuffer(this.canvases['c_uv'].uniformBuffer, 0, this.canvases['c_uv'].uniformValues);
    this.renderCanvas(this.canvases['c_uv']);

    this.canvases['c_u'].uniformValues.set([this.ignore_different_grayscale, this.different_grayscale_tolerance, this.yuv_y / 255, this.yuv_v / 255]);
    this.device.queue.writeBuffer(this.canvases['c_u'].uniformBuffer, 0, this.canvases['c_u'].uniformValues);
    this.renderCanvas(this.canvases['c_u']);

    this.canvases['c_v'].uniformValues.set([this.ignore_different_grayscale, this.different_grayscale_tolerance, this.yuv_y / 255, this.yuv_u / 255]);
    this.device.queue.writeBuffer(this.canvases['c_v'].uniformBuffer, 0, this.canvases['c_v'].uniformValues);
    this.renderCanvas(this.canvases['c_v']);




  }

  updateValues() {
    // this.rgb = this.yuv_to_rgb(this.yuv_y, this.yuv_u, this.yuv_v);
    this.yuv_to_rgb(this.yuv_y, this.yuv_u, this.yuv_v);
    //this.onColorChange(this.rgb);

    
    
    this.shadow.getElementById("span_yuv").innerHTML = "y: " + parseInt(this.yuv_y) + " u: " + parseInt(this.yuv_u) + " v: " + parseInt(this.yuv_v);
    this.shadow.getElementById("span_rgb").innerHTML = "r: " + this.rgb_r + " g: " + this.rgb_g + " b: " + this.rgb_b + " a: " + parseInt(this.a);
    this.shadow.getElementById("span_rgb_display").style.backgroundColor = "rgba(" + this.rgb_r + "," + this.rgb_g + "," + this.rgb_b + "," + 1 + ")";
    this.shadow.getElementById("span_rgb_display_alpha").style.backgroundColor = "rgba(" + this.rgb_r + "," + this.rgb_g + "," + this.rgb_b + "," + this.a / 255 + ")";

    this.shadow.getElementById("d_a").style.background = "linear-gradient(to right, rgba(0, 0, 0, 0), rgba(" + this.rgb_r + "," + this.rgb_g + "," + this.rgb_b + "," + 1 + "))";
  }

  clamp(number, lower, upper) {
    return Math.min(upper, Math.max(lower, number));
  }

  yuv_to_rgb(y, u, v) {

    y = Number(y);
    u = Number(u);
    v = Number(v);

    // var r = clamp((y + 1.140 * (v - 0.5)), 0, 1) ;
    // var g = clamp((y - 0.395 * (u - 0.5) - 0.581 * (v - 0.5)), 0, 1) ;
    // var b = clamp((y + 2.033 * (u - 0.5)), 0, 1);
    var r = this.clamp((y + 1.140 * (v - 128)), 0, 255);
    var g = this.clamp((y - 0.395 * (u - 128) - 0.581 * (v - 128)), 0, 255);
    var b = this.clamp((y + 2.033 * (u - 128)), 0, 255);

    //console.log("y,u,v", y, u, v)

    //return { r, g, b };
    this.rgb_r = parseInt(r);
    this.rgb_g = parseInt(g);
    this.rgb_b = parseInt(b);
  }

  destroy() {
    this.device.destroy();
    this.shadow.remove();
  }
}

export default YUVColorPicker;






let uniformPart = /* wgsl */`
  struct Uniforms {
    switch_show_all: f32,
    tolerance: f32,
    y: f32,
  };

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;

`;


let vertexShaderPart = /* wgsl */`
  struct OurVertexShaderOutput {
    @builtin(position) position: vec4f,
    //@location(0) color: vec4f,
    @location(0) uv_data: vec2f,
  };

  @vertex fn vs(
    @builtin(vertex_index) vertexIndex : u32
  ) -> OurVertexShaderOutput {
    let pos = array(
      vec2f( -1,  1),//Top Left
      vec2f(-1, -1), //Bottom Left
      vec2f( 1, 1),  //Top Right (Diagonal)
      vec2f( 1, -1), //Bottom Right

      // vec2f( -0.5,  0.5),//Top Left
      // vec2f(-0.5, -0.5), //Bottom Left
      // vec2f( 0.5, 0.5),  //Top Right (Diagonal)
      // vec2f( 0.5, -0.5), //Bottom Right 


    );


    var uv_data = array<vec2f, 4>(
      vec2f(0, 0),
      vec2f(0, 1),
      vec2f(1, 0), //color direction will change if swapping this with the upper line
      vec2f(1, 1),
    );

    var vsOutput: OurVertexShaderOutput;
    vsOutput.position = vec4f(pos[vertexIndex], 0.0, 1.0);
    //vsOutput.color = color[vertexIndex];
    vsOutput.uv_data = uv_data[vertexIndex];
    return vsOutput;
  }

`;



let functionPart = /* wgsl */`
  const WR:f32 = 0.299;
  const WG:f32 = 0.587;
  const WB:f32 = 0.114;



  fn is_approximately_equal(a: f32, b: f32) -> bool {
    //let epsilon = 1e-2;
    //let epsilon = 1e-2 / 2;
    let epsilon = 1e-3;
    //let epsilon = 1e-4;
    //let epsilon = 1e-4 / 1.5;
    return abs(a - b) < epsilon;
  }


  fn rgb_to_grayscale(r:f32, g:f32, b:f32) -> f32 {
    
    //return Math.round(WR * r + WG * g + WB * b);
    return WR * r + WG * g + WB * b;
    //return roundToNearestHalf(WR * r + WG * g + WB * b);
    //return;
  }


  fn yuv_to_rgb(y: f32, u: f32, v: f32) -> vec3f {
    //return a + b;

    // var r:f32 = clamp(Math.round(y + 1.14 * (v - 128/255)), 0, 255/255);
    // var g:f32 = clamp(
    //   Math.round(y - 0.395 * (u - 128/255) - 0.581 * (v - 128/255)),
    //   0,
    //   255,
    // );
    // var b:f32 = clamp(Math.round(y + 2.033 * (u - 128/255)), 0, 255/255);

    var r:f32 = clamp((y + 1.140 * (v - 0.5)), 0, 1);
    var g:f32 = clamp((y - 0.395 * (u - 0.5) - 0.581 * (v - 0.5)), 0, 1);
    var b:f32 = clamp((y + 2.033 * (u - 0.5)), 0, 1);

    return vec3f(r, g, b);
  }
`;


let fragmentShaderPart = /* wgsl */`

 
  //-----------------

  //@fragment fn fs(fsInput: OurVertexShaderOutput) -> @location(0) vec4f { //OK
  //     return fsInput.color;
  // }
  //@fragment fn fs(@location(0) color: vec4f) -> @location(0) vec4f { //You can pass property from the struct directly. This location(0) shall match what's in the struct. Note that this is different from the @location(0) in the output
  @fragment fn fs(@location(0) uv_data: vec2f) -> @location(0) vec4f { 
 
    //var y: f32 = 0.5;
    //------Uniform----------
    let switch_show_all = uniforms.switch_show_all;
    let tolerance = uniforms.tolerance;
    let y = uniforms.y;
    //----------------

    
    var rgb: vec3f = yuv_to_rgb(y, uv_data.x, uv_data.y);
    
    var grayscale: f32 = rgb_to_grayscale(rgb.r, rgb.g, rgb.b);
    
   
  
    //----------------------

    //Simplify from conditional clauses //switch_show_all should be f32 too
    //let is_approx = abs(y - grayscale) < 1e-3; 
    let is_approx = abs(y - grayscale) < tolerance; 
    let factor = f32((switch_show_all == 1) || ((switch_show_all != 1) && is_approx));
    let background = vec4f(0.5, 0.5, 0.5, 1);
    return mix(background, vec4f(rgb, 1.0), factor);


  }
`;




let uv_shader_code = /* wgsl */ `
  ${vertexShaderPart}
  
  
  ${uniformPart}


  ${functionPart}


  ${fragmentShaderPart}
`;


//=======================================

let uniformPart_u = /* wgsl */`
  struct Uniforms {
    switch_show_all: f32,
    tolerance: f32,
    y: f32,
    v: f32,
  };

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;

`;


let fragmentShaderPart_u = /* wgsl */`

  @fragment fn fs(@location(0) uv_data: vec2f) -> @location(0) vec4f {//You can pass property from the struct directly. This location(0) shall match what's in the struct. Note that this is different from the @location(0) in the output
 
    //------Uniform----------
    let switch_show_all = uniforms.switch_show_all;
    let tolerance = uniforms.tolerance;
    let y = uniforms.y;
    let v = uniforms.v;
    //----------------

    
    var rgb: vec3f = yuv_to_rgb(y, uv_data.x, v);
    
    var grayscale: f32 = rgb_to_grayscale(rgb.r, rgb.g, rgb.b);
    



    //Simplify from conditional clauses //switch_show_all should be f32 too
    //let is_approx = abs(y - grayscale) < 1e-3; 
    let is_approx = abs(y - grayscale) < tolerance; 
    let factor = f32((switch_show_all == 1) || ((switch_show_all != 1) && is_approx));
    let background = vec4f(0.5, 0.5, 0.5, 1);
    return mix(background, vec4f(rgb, 1.0), factor);

  }
`;

let u_shader_code = /* wgsl */ `
  ${vertexShaderPart}


  ${uniformPart_u}

  ${functionPart}

  ${fragmentShaderPart_u}
`;


//=======================================


let uniformPart_v = /* wgsl */`
  struct Uniforms {
    switch_show_all: f32,
    tolerance: f32,
    y: f32,
    u: f32,
  };

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;

`;


let fragmentShaderPart_v = /* wgsl */`

  @fragment fn fs(@location(0) uv_data: vec2f) -> @location(0) vec4f { //You can pass property from the struct directly. This location(0) shall match what's in the struct. Note that this is different from the @location(0) in the output
 
    //------Uniform----------
    let switch_show_all = uniforms.switch_show_all;
    let tolerance = uniforms.tolerance;
    let y = uniforms.y;
    let u = uniforms.u;
    //----------------

    
    var rgb: vec3f = yuv_to_rgb(y, u, uv_data.x); //the order of uv_data in vertex shader is IRRELAVANT
    
    var grayscale: f32 = rgb_to_grayscale(rgb.r, rgb.g, rgb.b);
    
 

    //Simplify from conditional clauses //switch_show_all should be f32 too
    //let is_approx = abs(y - grayscale) < 1e-3; 
    let is_approx = abs(y - grayscale) < tolerance; 
    let factor = f32((switch_show_all == 1) || ((switch_show_all != 1) && is_approx));
    let background = vec4f(0.5, 0.5, 0.5, 1);
    return mix(background, vec4f(rgb, 1.0), factor);

  }
`;

let v_shader_code = /* wgsl */ `
  ${vertexShaderPart}


  ${uniformPart_v}

  ${functionPart}

  ${fragmentShaderPart_v}
`;