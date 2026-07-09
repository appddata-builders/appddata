import HomeDevelop from "../components/home/home-develop";
import ProductExperience from "../components/products/product-experience";
import ProductTestimonial from "../components/products/product-testimonial";
import SiteFooter from "../components/site-footer";

export default function ProductsPage() {
  return (
    <main className="app-min-h-screen bg-white text-[#111827]">
      <section className="relative overflow-hidden border-b border-slate-200 px-4 pb-10 pt-24 sm:px-6 sm:pb-14 sm:pt-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(66,111,235,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(56,81,245,0.10),transparent_30%)]" />

        <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-10">
          <div className="max-w-4xl">
            <p className="text-[0.7rem] uppercase tracking-[0.45em] text-[#0C6CC6] font-bold">
              Experiencia Digital
            </p>
            <h1 className="mt-4 text-4xl font-light tracking-[0.08em] text-[#111827] sm:text-6xl">
              Lo que entregamos a nuestros clientes
            </h1>
            <p className="mt-6 max-w-3xl text-sm leading-7 tracking-[0.04em] text-slate-700 sm:text-base">
              Cada proyecto es una oportunidad para crear algo único y memorable. Nos enorgullece entregar experiencias digitales que no solo cumplen con las expectativas de nuestros clientes, sino que también superan las de sus usuarios finales. Nuestro compromiso es transformar ideas en realidades digitales que inspiren y conecten.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-6xl flex-col items-center">
        <HomeDevelop />
        <ProductExperience />
        <ProductTestimonial />
      </div>

      <SiteFooter />
    </main>
  );
}
