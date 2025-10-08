import Image from "next/image";

export default function SongWriterLogo({ width, height }: { width: number; height: number }) {
    return (
        <div className="flex items-center">
            <Image src="/songwriter-logo-black.png" alt="SongWriter Logo" width={width} height={height} />
        </div>
    );
}