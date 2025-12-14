import React from "react";
import { useParams } from "react-router-dom";
import CountryLayout from "../layout/CountryLayout";

export default function Country() {
  const { slug } = useParams();

  return (
    <CountryLayout>
      <h2>{slug.toUpperCase()}</h2>
      <p>Aquí cargaremos las secciones dinámicas.</p>
    </CountryLayout>
  );
}
