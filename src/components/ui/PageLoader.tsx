import { DataView } from "primereact/dataview";
import { ProgressSpinner } from "primereact/progressspinner";

type LoaderItem = {
  id: number;
};

const loaderItems: LoaderItem[] = [{ id: 1 }];

type PageLoaderProps = {
  message?: string;
};

export default function PageLoader({
  message = "Loading, please wait...",
}: PageLoaderProps) {
  const itemTemplate = () => {
    return (
      <div className="page-loader-card">
        <ProgressSpinner
          style={{ width: "42px", height: "42px" }}
          strokeWidth="4"
        />

        <div>
          <h4>Processing request</h4>
          <p>{message}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="page-loader-wrapper">
      <DataView value={loaderItems} itemTemplate={itemTemplate} />
    </div>
  );
}