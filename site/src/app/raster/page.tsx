"use client";

import RasterSearch from "./search";
import MyForm from "./search";

export default function Raster() {
  return (
    <div className="font-base">
      <h1 className="mb-8 text-2xl font-heading sm:text-4xl">Raster Logs</h1>

      <div className="mb-10 text-base sm:text-lg">
        <p>
          Lorem ipsum dolor sit amet consectetur, adipisicing elit. Est
          consequatur, harum pariatur provident rerum placeat magni voluptas
          consectetur in exercitationem nobis aut, molestiae iure possimus
          aspernatur nesciunt laudantium ab atque.
        </p>
        hello
        {/* <RasterSearch /> */}
        <MyForm />
        hello
      </div>
    </div>
  );
}
