import { AssetList } from "../components/asset-list";

export default function AssetsPage() {
  return (
    <div className="space-y-4 mt-3">
      <h1 className="text-2xl font-semibold px-1">Assets</h1>
      <section className="rounded-3xl p-4" style={{ background: "var(--color-slush-card)" }}>
        <AssetList showFilters hideZero={false} />
      </section>
    </div>
  );
}
