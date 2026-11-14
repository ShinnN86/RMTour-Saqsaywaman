
import * as THREE from "three";

export class VRNavigation {

  constructor({
    scene,
    camera,
    renderer,
    onNext,
    onPrevious
  }) {

    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;

    this.onNext = onNext;
    this.onPrevious = onPrevious;

    this.raycaster = new THREE.Raycaster();

    this.botones = [];
    this.grupo = null;

    this.tiempoApuntado = 1000;

    this.handleSessionStart = () => {
      console.log("VR activado");
      this.crearBotones();
    };

    this.handleSessionEnd = () => {
      console.log("VR desactivado");
      this.limpiar();
    };

    this.renderer.xr.addEventListener(
      "sessionstart",
      this.handleSessionStart
    );

    this.renderer.xr.addEventListener(
      "sessionend",
      this.handleSessionEnd
    );
  }

  // CREAR BOTONES
  crearBotones() {

    this.limpiar();

    this.grupo = new THREE.Group();

    const crear = (texto, x, direccion) => {

      const geometry = new THREE.CircleGeometry(
        0.13,
        48
      );

      const material = new THREE.MeshBasicMaterial({
        color: 0x0088cc,
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide,
        depthTest: false,
        depthWrite: false
      });

      const boton = new THREE.Mesh(
        geometry,
        material
      );

      boton.position.set(x, -0.25, -2);

      // TEXTO
      const canvas = document.createElement("canvas");

      canvas.width = 256;
      canvas.height = 256;

      const ctx = canvas.getContext("2d");

      ctx.clearRect(0, 0, 256, 256);

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
          depthTest: false,
          depthWrite: false
        })
      );

      sprite.scale.set(0.17, 0.17, 1);

      boton.add(sprite);

      boton.userData.direccion = direccion;
      boton.userData.inicio = null;
      boton.userData.activado = false;

      this.grupo.add(boton);

      this.botones.push(boton);
    };

    crear("❮", -0.25, "anterior");
    crear("❯", 0.25, "siguiente");

    // Ahora pertenecen a la escena y sí se renderizan
    this.scene.add(this.grupo);
  }

  // ACTUALIZAR POSICIÓN SEGÚN CÁMARA VR
  update() {

    if (!this.renderer.xr.isPresenting) return;
    if (!this.grupo || this.botones.length === 0) return;

    const xrCamera = this.renderer.xr.getCamera(
      this.camera
    );

    xrCamera.updateMatrixWorld(true);

    // Obtener posición y orientación de la cámara XR
    const matrix = xrCamera.matrixWorld;

    this.grupo.position.setFromMatrixPosition(matrix);

    this.grupo.quaternion.setFromRotationMatrix(matrix);

    this.grupo.updateMatrixWorld(true);

    // Rayo desde el centro de la mirada
    const origen = new THREE.Vector3()
      .setFromMatrixPosition(matrix);

    const direccion = new THREE.Vector3(0, 0, -1)
      .applyQuaternion(this.grupo.quaternion)
      .normalize();

    this.raycaster.ray.set(origen, direccion);

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

  // EJECUTAR NAVEGACIÓN
  ejecutar(boton) {

    const direccion = boton.userData.direccion;

    if (direccion === "siguiente") {
      this.onNext?.();
    } else {
      this.onPrevious?.();
    }

    this.resetearBotones();
  }

  // REINICIAR APUNTADO
  resetearBotones(excepto = null) {

    this.botones.forEach(boton => {

      if (boton !== excepto) {

        boton.userData.inicio = null;
        boton.userData.activado = false;

        boton.material.color.set(0x0088cc);
      }
    });
  }

  // ELIMINAR BOTONES
  limpiar() {

    if (this.grupo) {
      this.scene.remove(this.grupo);
    }

    this.botones.forEach(boton => {

      boton.geometry.dispose();
      boton.material.dispose();

      const sprite = boton.children[0];

      if (sprite) {
        sprite.material.map?.dispose();
        sprite.material.dispose();
      }
    });

    this.botones = [];
    this.grupo = null;
  }

  // LIBERAR RECURSOS
  dispose() {

    this.limpiar();

    this.renderer.xr.removeEventListener(
      "sessionstart",
      this.handleSessionStart
    );

    this.renderer.xr.removeEventListener(
      "sessionend",
      this.handleSessionEnd
    );
  }
}
