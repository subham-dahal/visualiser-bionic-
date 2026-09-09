import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const children = [
  { w: 0.5, h: 0.5, d: 0.5, x: 0,   y: 0,   z: 0   },
  { w: 1.0, h: 0.3, d: 0.8, x: 0.5, y: 0,   z: 0.2 },
  { w: 0.4, h: 0.8, d: 0.4, x: 0,   y: 0.5, z: 1.0 },
];

const colours = [ 0xff6600, 0x00cc44, 0xcc00ff, 0xffcc00, 0xff0055 ];

const BoxSize = { w: 2.001, h: 2.001, d: 2.001 };

//BoxSize = (width, height, depth);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);


const geometry = new THREE.BoxGeometry( BoxSize.w, BoxSize.h, BoxSize.d );
const material = new THREE.MeshBasicMaterial({ color: 0x87ceeb, transparent: true, opacity: 0.3, depthWrite: false });
const cube = new THREE.Mesh( geometry, material );
cube.position.set(BoxSize.w/2, BoxSize.h/2, BoxSize.d/2);
scene.add( cube );

children.forEach(( item, i ) => {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry( item.w, item.h, item.d ),
    new THREE.MeshBasicMaterial({ color: colours[ i % colours.length ],transparent: true, opacity: .7 })
  );
  mesh.position.set(
    item.x + item.w / 2 - BoxSize.w / 2,
    item.y + item.h / 2 - BoxSize.h / 2,
    item.z + item.d / 2 - BoxSize.d / 2
  );
  cube.add( mesh );
});

const axesHelper = new THREE.AxesHelper( 10 );
scene.add( axesHelper );

camera.position.z = BoxSize.d*2;
camera.position.y = BoxSize.h*2;
camera.position.x = BoxSize.w*2;

const controls = new OrbitControls( camera, renderer.domElement );
controls.target.set( BoxSize.w / 2, BoxSize.h / 2, BoxSize.d / 2 );
camera.lookAt( BoxSize.w / 2, BoxSize.h / 2, BoxSize.d / 2 );
controls.update();

function animate() {
requestAnimationFrame(animate);

    controls.update(); 

    renderer.render(scene, camera);
}
animate();