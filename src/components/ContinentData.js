// ContinentData.js
// Datos por continente con imágenes realistas (placeholders) y conflictos

export const latinAmericaData = {
  brazil: { name: "Brasil", coordinates: [-47.8825, -15.7942], image: "/brazil-rio.jpg", description: "El gigante sudamericano.", hasConflict: false },
  argentina: { name: "Argentina", coordinates: [-58.3816, -34.6037], image: "/argentina-buenos-aires.jpg", description: "País austral de gran cultura.", hasConflict: false },
  mexico: { name: "México", coordinates: [-99.1332, 19.4326], image: "/mexico-city.jpg", description: "Centro histórico y cultural de América del Norte.", hasConflict: false },
  colombia: { name: "Colombia", coordinates: [-74.0721, 4.7110], image: "/colombia-bogota.jpg", description: "País biodiverso en el corazón de los Andes.", hasConflict: false },
  chile: { name: "Chile", coordinates: [-70.6693, -33.4489], image: "/chile-santiago.jpg", description: "Largo país entre los Andes y el Pacífico.", hasConflict: false },
  peru: { name: "Perú", coordinates: [-77.0428, -12.0464], image: "/peru-lima.jpg", description: "Cuna del Imperio Inca.", hasConflict: false },
  venezuela: { name: "Venezuela", coordinates: [-66.9036, 10.4806], image: "/venezuela-caracas.jpg", description: "País petrolero con historia compleja.", hasConflict: true }, // conflicto
};

export const africaData = {
  nigeria: { name: "Nigeria", coordinates: [3.3792, 6.5244], image: "/nigeria-lagos.jpg", description: "La mayor economía africana.", hasConflict: false },
  south_africa: { name: "Sudáfrica", coordinates: [18.4241, -33.9249], image: "/south-africa-cape-town.jpg", description: "País diverso en la punta del continente.", hasConflict: false },
  egypt: { name: "Egipto", coordinates: [31.2357, 30.0444], image: "/egypt-pyramids.jpg", description: "Cuna de la civilización del Nilo.", hasConflict: false },
  algeria_non_arab: { name: "Argelia (No duplicar Magreb árabe)", coordinates: [3.0588, 36.7538], image: "/algeria.jpg", description: "País del norte de África.", hasConflict: false },
  ethiopia: { name: "Etiopía", coordinates: [38.7578, 9.0319], image: "/ethiopia-addis.jpg", description: "Antigua civilización del Cuerno de África.", hasConflict: false },
  kenya: { name: "Kenia", coordinates: [36.8219, -1.2921], image: "/kenya-nairobi.jpg", description: "Centro económico del África Oriental.", hasConflict: false },
};

export const europeData = {
  spain: { name: "España", coordinates: [-3.7038, 40.4168], image: "/spain-madrid.jpg", description: "País ibérico de gran historia.", hasConflict: false },
  france: { name: "Francia", coordinates: [2.3522, 48.8566], image: "/france-paris.jpg", description: "Centro cultural europeo.", hasConflict: false },
  germany: { name: "Alemania", coordinates: [13.405, 52.52], image: "/germany-berlin.jpg", description: "Potencia económica europea.", hasConflict: false },
  uk: { name: "Reino Unido", coordinates: [-0.1276, 51.5074], image: "/uk-london.jpg", description: "Islas británicas con historia global.", hasConflict: false },
  italy: { name: "Italia", coordinates: [12.4964, 41.9028], image: "/italy-rome.jpg", description: "Cuna del Imperio Romano.", hasConflict: false },
  poland: { name: "Polonia", coordinates: [21.0122, 52.2297], image: "/poland-warsaw.jpg", description: "País clave en Europa del Este.", hasConflict: false },
  ukraine: { name: "Ucrania", coordinates: [30.5234, 50.4501], image: "/ukraine-kyiv.jpg", description: "País en conflicto activo.", hasConflict: true },
};

export const asiaData = {
  china: { name: "China", coordinates: [116.4074, 39.9042], image: "/china-beijing.jpg", description: "La nación más poblada del mundo.", hasConflict: false },
  india: { name: "India", coordinates: [77.209, 28.6139], image: "/india-delhi.jpg", description: "Gigante del sur de Asia.", hasConflict: false },
  japan: { name: "Japón", coordinates: [139.6917, 35.6895], image: "/japan-tokyo.jpg", description: "Islas tecnológicas del Pacífico.", hasConflict: false },
  south_korea: { name: "Corea del Sur", coordinates: [126.978, 37.5665], image: "/korea-seoul.jpg", description: "Potencia tecnológica asiática.", hasConflict: false },
  indonesia: { name: "Indonesia", coordinates: [106.8456, -6.2088], image: "/indonesia-jakarta.jpg", description: "Archipiélago más grande del mundo.", hasConflict: false },
  pakistan: { name: "Pakistán", coordinates: [73.0479, 33.6844], image: "/pakistan-islamabad.jpg", description: "País estratégico del sur de Asia.", hasConflict: false },
};
