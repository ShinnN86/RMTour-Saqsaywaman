import * as THREE from "three";

export class VRNavigation {

  constructor({
    camera,
    renderer,
    onNext,
    onPrevious
  }) {

    this.camera = camera;
    this.renderer = renderer;

    this.onNext = onNext;
    this.onPrevious = onPrevious;

    this.raycaster = new THREE.Raycaster();

    this.botones = [];

    this.tiempoApuntado = 1000;

    this.crearBotones();
  }

  crearBotones() {

    this.limpiar();

    const crear = (texto, x, direccion) => {

      const geometry = new THREE.CircleGeometry(
        0.13,
        48
      );

      const material = new THREE.MeshBasicMaterial({
        color: 0x0088cc,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        depthTest: false
      });

      const boton = new THREE.Mesh(
        geometry,
        material
      );

      boton.position.set(x, -0.25, -2);

      // Texto
      const canvas = document.createElement("canvas");

      canvas.width = 256;
      canvas.height = 256;

      const ctx = canvas.getContext("2d");

      ctx.fillStyle = "white";
      ctx.font = "bold 150px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.fillText(texto, 128, 128);

      const texture = new THREE.CanvasTexture(canvas);

      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: texture,
          transparent: true,
          depthTest: false
        })
      );

      sprite.scale.set(0.17, 0.17, 1);

      boton.add(sprite);

      boton.userData.direccion = direccion;
      boton.userData.inicio = null;
      boton.userData.activado = false;

      this.camera.add(boton);

      this.botones.push(boton);
    };

    crear("❮", -0.25, "anterior");

    crear("❯", 0.25, "siguiente");
  }


  update() {

    if (!this.renderer.xr.isPresenting) {
      return;
    }

    const xrCamera = this.renderer.xr.getCamera(
      this.camera
    );

    xrCamera.updateMatrixWorld(true);

    this.raycaster.ray.origin.setFromMatrixPosition(
      xrCamera.matrixWorld
    );

    xrCamera.getWorldDirection(
      this.raycaster.ray.direction
    );

    const hits = this.raycaster.intersectObjects(
      this.botones,
      false
    );

    if (hits.length === 0) {

      this.resetearBotones();

      return;
    }

    const boton = hits[0].object;

    this.resetearBotones(boton);

    boton.material.color.set(0x00ffff);

    if (boton.userData.inicio === null) {

      boton.userData.inicio = performance.now();

    }

    const tiempo =
      performance.now() - boton.userData.inicio;

    if (
      tiempo >= this.tiempoApuntado &&
      !boton.userData.activado
    ) {

      boton.userData.activado = true;

      this.ejecutar(boton);
    }
  }



  ejecutar(boton) {

    const direccion = boton.userData.direccion;

    if (direccion === "siguiente") {

      this.onNext?.();

    } else {

      this.onPrevious?.();

    }

    this.resetearBotones();
  }



  resetearBotones(excepto = null) {

    this.botones.forEach(boton => {

      if (boton !== excepto) {

        boton.userData.inicio = null;
        boton.userData.activado = false;

        boton.material.color.set(0x0088cc);
      }

    });
  }


  limpiar() {

    this.botones.forEach(boton => {

      this.camera.remove(boton);

      boton.geometry.dispose();
      boton.material.dispose();

      const sprite = boton.children[0];

      if (sprite) {

        sprite.material.map?.dispose();
        sprite.material.dispose();

      }

    });

    this.botones = [];
  }

  dispose() {

    this.limpiar();

  }
}