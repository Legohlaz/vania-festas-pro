"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, type KeyboardEvent } from "react";
import { ArrowDown, ArrowRight, ArrowUpRight, Check, Heart, MessageCircle, Sparkles, Truck } from "lucide-react";

import { Container } from "@/components/common/Container";
import weddingImage from "@/public/images/home/casamento.jpg";
import kidsImage from "@/public/images/home/infantil.jpg";
import birthdayImage from "@/public/images/home/quinze-anos.jpg";
import styles from "./Hero.module.css";

const celebrations = [
  {
    id: "casamento",
    label: "Casamentos",
    detail: "Para celebrar o sim",
    title: "Seu grande dia.",
    highlight: "Do seu jeito.",
    description: "Da primeira ideia ao último detalhe. Encontre a decoração e os materiais para celebrar a sua história.",
    image: weddingImage,
    alt: "Inspiração de mesa de casamento com flores, taças e detalhes dourados",
    caption: "Detalhes que viram memórias.",
    position: "65% center",
  },
  {
    id: "festa-infantil",
    label: "Festa infantil",
    detail: "Um mundo de imaginação",
    title: "Pequena festa.",
    highlight: "Grandes sorrisos.",
    description: "Cores, temas e uma boa dose de imaginação. Descubra os detalhes para uma festa com a carinha de quem você ama.",
    image: kidsImage,
    alt: "Inspiração para festa infantil com balões coloridos",
    caption: "A alegria mora nos detalhes.",
    position: "65% center",
  },
  {
    id: "15-anos",
    label: "15 anos",
    detail: "Uma noite para brilhar",
    title: "Uma nova fase.",
    highlight: "Todo seu brilho.",
    description: "Uma celebração tão especial quanto esse momento. Explore cenários e composições para uma noite inesquecível.",
    image: birthdayImage,
    alt: "Inspiração de salão de festa com mesas decoradas e lustres iluminados",
    caption: "Seu sonho merece esse cenário.",
    position: "70% center",
  },
] as const;

export function Hero() {
  const [activeIndex, setActiveIndex] = useState(0);
  const controls = useRef<Array<HTMLButtonElement | null>>([]);
  const celebration = celebrations[activeIndex];

  function navigateCelebrations(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % celebrations.length;
    else if (event.key === "ArrowLeft") nextIndex = (index + celebrations.length - 1) % celebrations.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = celebrations.length - 1;
    else return;

    event.preventDefault();
    setActiveIndex(nextIndex);
    controls.current[nextIndex]?.focus();
  }

  return (
    <section className={styles.section} aria-label="Inspiração para a sua festa">
      <Container className={styles.container}>
        <div className={styles.banner}>
          <div className={styles.photos}>
            {celebrations.map((item, index) => (
              <div key={item.id} className={styles.photo} data-active={index === activeIndex} aria-hidden={index !== activeIndex}>
                <Image
                  src={item.image}
                  alt={item.alt}
                  fill
                  placeholder="blur"
                  sizes="(max-width: 767px) 100vw, (max-width: 1440px) 95vw, 1312px"
                  loading={index === 0 ? "eager" : "lazy"}
                  fetchPriority={index === 0 ? "high" : "auto"}
                  style={{ objectPosition: item.position }}
                  className={styles.image}
                />
              </div>
            ))}
          </div>
          <div className={styles.shade} aria-hidden="true" />
          <div className={styles.topline}>
            <span className={styles.eyebrow}><span className={styles.smallStar} aria-hidden="true">✳</span> FEITO PARA CELEBRAR</span>
            <span className={styles.serviceLabel}>LOCAÇÃO · DECORAÇÃO · MONTAGEM</span>
          </div>

          <div className={styles.stage}>
            <div className={styles.content}>
              <div id="hero-scene" aria-live="polite" aria-atomic="true">
                <div key={celebration.id} className={styles.copy}>
                  <h1 className={styles.headline}>
                    <span>{celebration.title}</span>
                    <em>{celebration.highlight}</em>
                  </h1>
                  <p className={styles.description}>{celebration.description}</p>
                </div>
              </div>
              <div className={styles.actions}>
                <Link href={"/catalogo?evento=" + celebration.id} className={styles.primaryAction}>
                  Explorar opções <ArrowUpRight size={19} aria-hidden="true" />
                </Link>
                <Link href="/contato" className={styles.secondaryAction}>
                  <MessageCircle size={17} aria-hidden="true" /> Solicitar orçamento
                </Link>
              </div>
              <p className={styles.personalNote}><Heart size={14} aria-hidden="true" /> Você imagina. A gente ajuda a realizar.</p>
            </div>

            <div className={styles.photoNote} aria-hidden="true">
              <Sparkles size={23} strokeWidth={1.3} />
              <p key={celebration.id}>{celebration.caption}</p>
              <span>IMAGEM INSPIRACIONAL</span>
            </div>
          </div>

          <div className={styles.selector}>
            <div className={styles.selectorHeading}>
              <span>O que vamos celebrar?</span>
              <span className={styles.selectorHint}>Escolha seu momento <ArrowDown size={13} aria-hidden="true" /></span>
            </div>
            <div className={styles.choices} role="group" aria-label="Escolha o tipo de evento">
              {celebrations.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  ref={(element) => { controls.current[index] = element; }}
                  className={styles.choice}
                  aria-pressed={index === activeIndex}
                  aria-controls="hero-scene"
                  onClick={() => setActiveIndex(index)}
                  onKeyDown={(event) => navigateCelebrations(event, index)}
                >
                  <span className={styles.choiceNumber}>0{index + 1}</span>
                  <span className={styles.choiceText}><strong>{item.label}</strong><span>{item.detail}</span></span>
                  <span className={styles.choiceArrow} aria-hidden="true"><ArrowUpRight size={18} /></span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.bottomLine}>
          <ul className={styles.benefits} aria-label="Nossos serviços">
            <li><Check size={17} aria-hidden="true" /> Atendimento próximo</li>
            <li><Truck size={17} aria-hidden="true" /> Entrega e montagem</li>
            <li><Sparkles size={17} aria-hidden="true" /> Decoração com personalidade</li>
          </ul>
          <Link href="/catalogo" className={styles.allEvents}>Todos os eventos <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
      </Container>
    </section>
  );
}
