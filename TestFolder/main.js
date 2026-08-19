import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const width = 2.001, depth = 2.001, height = 2.001;

//BoxSize = (width, height, depth);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);


const geometry = new THREE.BoxGeometry( width, height, depth );
const material = new THREE.MeshBasicMaterial({ color: 0x87ceeb, transparent: true, opacity: 0.3 });
const cube = new THREE.Mesh( geometry, material );
cube.position.set(width/2, height/2, depth/2);
scene.add( cube );

const childGeometry = new THREE.BoxGeometry( 1, 0.4, 0.4 );
const childMaterial = new THREE.MeshBasicMaterial({ color: 0xff6600 });
const childBox = new THREE.Mesh( childGeometry, childMaterial );
childBox.position.set(0, -.3, -0.3 ); 
cube.add( childBox );

const axesHelper = new THREE.AxesHelper( 10 );
scene.add( axesHelper );

camera.position.z = depth*2;
camera.position.y = height*2;
camera.position.x = width*2;

const controls = new OrbitControls( camera, renderer.domElement );

function animate() {
requestAnimationFrame(animate);
controls.target.set( width / 2, height / 2, depth / 2 );

    controls.update(); 

    renderer.render(scene, camera);
}
animate();