import team1 from "@/assets/team/01.webp";
import team2 from "@/assets/team/02.webp";
import team3 from "@/assets/team/03.webp";
import team4 from "@/assets/team/04.webp";
import team5 from "@/assets/team/05.webp";
import team6 from "@/assets/team/06.webp";
import team7 from "@/assets/team/07.webp";
import team8 from "@/assets/team/08.webp";
import team9 from "@/assets/team/09.webp";

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
        image: team5,
        name: "Roberto Espinosa",
        role: "Abogado - Jefe de operaciones",
    },
    {
        image: team6,
        name: "Dioce Carrasco",
        role: "Broker Inmobiliario",
    },
    {
        image: team7,
        name: "Andrea Lugo",
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