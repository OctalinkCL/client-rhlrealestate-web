import team1 from "@/assets/staff/rodrigo.webp";
import team2 from "@/assets/staff/christian.webp";
import team3 from "@/assets/staff/marina.webp";
import team4 from "@/assets/staff/irma.webp";
import team6 from "@/assets/staff/dioce.webp";
import team8 from "@/assets/staff/alejandra.webp";
import team9 from "@/assets/staff/estefania.webp";

export interface TeamProps {
    image: ImageMetadata,
    name: string,
    role: string
}

export const team: TeamProps[] = [
    {
        image: team1,
        name: "Rodrigo Hernández",
        role: "Socio - Director",
    },
    {
        image: team2,
        name: "Christian Zaror",
        role: "Socio - Director",
    },
    {
        image: team3,
        name: "Marina De Bernardi",
        role: "Directora de Finanzas",
    },
    {
        image: team4,
        name: "Irma Moris",
        role: "Directora de Operaciones",
    },
    {
        image: team6,
        name: "Dioce Carrasco",
        role: "Broker Inmobiliario",
    },
    {
        image: team8,
        name: "Alejandra Boasso",
        role: "Broker Inmobiliario",
    },
    {
        image: team9,
        name: "Estefania Maya",
        role: "Broker Inmobiliario",
    },
];