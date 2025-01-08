import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
// import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js'
import GUI from 'lil-gui'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { WiggleBone } from 'wiggle';
// import { WiggleRigHelper } from "wiggle/helper";

/**
 * Loader
 */
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('draco/')

const gltfLoader = new GLTFLoader()
gltfLoader.setDRACOLoader(dracoLoader)

const textureLoader = new THREE.TextureLoader()

/**
 * Textures
 */
const bakedTexture = textureLoader.load('textures/baked.jpg')
bakedTexture.encoding = THREE.sRGBEncoding
bakedTexture.flipY = false
bakedTexture.colorSpace = THREE.SRGBColorSpace

const bgTexture = textureLoader.load('textures/eveningSkyTexture02.png')
bgTexture.colorSpace = THREE.SRGBColorSpace

/**
 * Material
 */
const bakedMaterial = new THREE.MeshBasicMaterial({
    map: bakedTexture,
    side: THREE.DoubleSide
})

/**
 * Base
 */
// Debug
const gui = new GUI()
gui.hide()

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()
scene.background = bgTexture

// Bones
const wiggleBones = [];

/**
 * Lights
 */
// Ambient light
const ambientLight = new THREE.AmbientLight('#fff', 1)
scene.add(ambientLight)

// Directional Light
const directionalLight = new THREE.DirectionalLight('#ffffff', 3)
directionalLight.position.set(1, 1, 0)
scene.add(directionalLight)

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () => {
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
const cameraAngle = { x: 0, y: 1, z: 3.6 }
camera.position.x = cameraAngle.x
camera.position.y = cameraAngle.y
camera.position.z = cameraAngle.z
scene.add(camera)

gui.add(camera.position, 'x').min(- 5).max(5).step(0.01).name('Camera X')
gui.add(camera.position, 'y').min(- 5).max(5).step(0.01).name('Camera Y')
gui.add(camera.position, 'z').min(- 5).max(5).step(0.01).name('Camera Z')

// Helpers
const axesHelper = new THREE.AxesHelper(5)
// scene.add(axesHelper)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true
controls.minDistance = 2.5
controls.maxDistance = 5
controls.minPolarAngle  = Math.PI / 4
controls.maxPolarAngle = Math.PI - Math.PI / 4;
controls.minAzimuthAngle = -Math.PI / 2;
controls.maxAzimuthAngle = Math.PI / 2;

if(isSmartPhone()){
    controls.enabled = false
}
// let transformControl = new TransformControls(camera, canvas)
// transformControl.addEventListener("dragging-changed", function (event) {
//     controls.enabled = !event.value;
// });

/**
 * Model
 */
let bunny = null

gltfLoader.load(
    'models/bunny.glb',
    (gltf) => {
        bunny = gltf.scene
        bunny.name = 'bunny';
        bunny.rotation.y = - Math.PI * 0.5
        bunny.scale.set(0.9, 0.9, 0.9)
        scene.add(bunny);

        bunny.traverse((child) => {
            child.material = bakedMaterial
        })

        const rootMesh = scene.getObjectByName('bunny');
        const rootObject = rootMesh.children[0].children.find((rootChild) => rootChild.name === 'Sphere001')

        // const helper = new WiggleRigHelper({
        //     skeleton: rootObject.skeleton,
        //     dotSize: 0.1,
        //     lineWidth: 0.01,
        // });
        // scene.add(helper);

        for (const bone of rootObject.skeleton.bones) {
            wiggleBones.push(new WiggleBone(bone, {
                velocity: 0.6,
            }))
        }

        // transformControl.attach(rootBone);
        // transformControl.attach(rootMesh);
        // transformControl.showY = false;
    }
)
// scene.add(transformControl);



/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

function loop() {
    requestAnimationFrame(loop);
    wiggleBones.forEach((wb) => wb.update());
    renderer.render(scene, camera)
}
loop();

/**
 * Raycaster
 */
const raycaster = new THREE.Raycaster()

/**
 * Mouse
 */
const mouse = new THREE.Vector2()

window.addEventListener('pointermove', (e) => {
    // マウスの座標を -1 ~ 1 の間の数値で取得する
    mouse.x = e.clientX / sizes.width * 2 - 1
    mouse.y = - (e.clientY / sizes.height) * 2 + 1
})

/**
 * Click
 */
let grabbing = false
window.addEventListener('pointerdown', () => {
    if(currentIntersect){
        controls.enabled = false;
        grabbing = true
    }else {
        grabbing = false;
    }
})

window.addEventListener('pointerup', () => {
    if(grabbing) {
        canvas.classList.remove('grabbing')
        grabbing = false;
        
        bunny.position.set(0, 0, 0)

        if(!isSmartPhone()){
            controls.enabled = true;
        }
    }
})

/**
 * Animate
 */
const clock = new THREE.Clock()
let currentIntersect = null

const currentScale = 0.9
const targetScale = 1
let scaled = false

function isSmartPhone() {
    if (navigator.userAgent.match(/iPhone|Android.+Mobile/)) {
        return true;
    } else {
        return false;
    }
}

const tick = () => {
    const elapsedTime = clock.getElapsedTime()

    // Update controls
    controls.update()

    // Update Object
    // Cast a ray
    raycaster.setFromCamera(mouse, camera)

    if(bunny){
        const intersects = raycaster.intersectObject(bunny)
        
        if (intersects.length) {
            currentIntersect = intersects[0]
            canvas.classList.add('grabbing')

            if(!scaled && !isSmartPhone()){
                bunny.scale.set(targetScale, targetScale, targetScale)
                scaled = true
            }

        } else {
            currentIntersect = null
            if(!grabbing) {
                canvas.classList.remove('grabbing')

                if(scaled && !isSmartPhone()){
                    bunny.scale.set(currentScale, currentScale, currentScale)
                    scaled = false
                }
                
            }
        }
    }

    if(grabbing){
        const ratio = isSmartPhone() ? { x: 2, y: 0.9 } : { x: 4, y: 1.5 }
        let x = (mouse.x * ratio.x)
        let y = (-mouse.y * ratio.y)

        bunny.position.x = x
        bunny.position.z = y
    }

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()