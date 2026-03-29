"use client";

import { useGLTF } from "@react-three/drei";
import type { ThreeElements } from "@react-three/fiber";
import type { BufferGeometry, Mesh, MeshStandardMaterial } from "three";

type GLTFResult = {
  nodes: {
    Cube000_ComputerDesk_0001_1: Mesh<BufferGeometry, MeshStandardMaterial>;
    Cube000_ComputerDesk_0001_2: Mesh<BufferGeometry, MeshStandardMaterial>;
  };
  materials: {
    "ComputerDesk.001": MeshStandardMaterial;
    "FloppyDisk.001": MeshStandardMaterial;
  };
};

type GroupProps = ThreeElements["group"];

export function Computer(props: GroupProps) {
  const { nodes, materials } = useGLTF(
    "/images/contact/computer-optimized-transformed.glb"
  ) as unknown as GLTFResult;

  return (
    <group {...props} dispose={null}>
      <group position={[-4.005, 67.549, 58.539]}>
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.Cube000_ComputerDesk_0001_1.geometry}
          material={materials["ComputerDesk.001"]}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.Cube000_ComputerDesk_0001_2.geometry}
          material={materials["FloppyDisk.001"]}
        />
      </group>
    </group>
  );
}

useGLTF.preload("/images/contact/computer-optimized-transformed.glb");

export default Computer;
