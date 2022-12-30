var model;

async function loadModel() {
    model = await tf.loadGraphModel('TFJS/model.json')
}

function predictImage() {
    // console.log('processing...');

    let image = cv.imread(canvas);
    cv.cvtColor(image, dst=image, cv.COLOR_RGBA2GRAY, 0);
    cv.threshold(image, image, 175, 255, cv.THRESH_BINARY);
    
    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(src=image, contours, hierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);

    let cnt = contours.get(0);
    let rect = cv.boundingRect(cnt);
    image = image.roi(rect);

    var height = image.rows;
    var width = image.cols;

    if (height > width) {
        height = 20;
        const sclaeFactor = image.rows / height;
        width = Math.round(image.cols/ sclaeFactor);
    } else {
        width = 20;
        const sclaeFactor = image.cols / width;
        height = Math.round(image.rows/ sclaeFactor);
    }

    let newSize = new cv.Size(width, height);
    cv.resize(src=image, dst=image, newSize, 0, 0, cv.INTER_AREA);

    const LEFT = Math.ceil(4 + (20 - width)/2);
    const RIGTH = Math.floor(4 + (20 - width)/2);
    const TOP = Math.ceil(4 + (20 - height)/2);
    const BOTTOM = Math.floor(4 + (20 - height)/2);
    // console.log(`top: ${TOP}, botoom: ${BOTTOM}, left: ${LEFT}, right: ${RIGTH}`);

    let BLACK = new cv.Scalar(0, 0, 0, 0);
    cv.copyMakeBorder(src=image, dst=image, TOP, BOTTOM, LEFT, RIGTH, cv.BORDER_CONSTANT, BLACK);

    // Centre of Mass

    cv.findContours(src=image, contours, hierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);
    cnt = contours.get(0);
    const Moments = cv.moments(cnt, false);

    const cx = Moments.m10/Moments.m00;
    const cy = Moments.m01/Moments.m00;
    // console.log(`cx: ${cx},cy: ${cy}, M00: ${Moments.m00} `);

    const X_SHIFT = Math.round(image.cols/2.0 - cx);
    const Y_SHIFT = Math.round(image.rows/2.0 - cy);
    
    // shifting the image
    let M = cv.matFromArray(2, 3, cv.CV_64FC1, [1, 0, X_SHIFT, 0, 1, Y_SHIFT]);
    newSize = new cv.Size(image.cols, image.rows);
    cv.warpAffine(src=image, dst=image, M, newSize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, BLACK);

    let pixelValues = image.data;
    // console.log(`original array: ${pixelValues}`);

    pixelValues = Float32Array.from(pixelValues);

    pixelValues = pixelValues.map(function(item) {
        return item / 255.0;
    });
    // console.log(`scaled array: ${pixelValues}`);

    const X = tf.tensor([pixelValues]);
    // console.log(`shape of tensor: ${X.shape}`);
    // console.log(`dtype of tensor: ${X.dtype}`);

    // prediction
    const result = model.predict(X);
    result.print();

    // console.log(tf.memory());

    const output = result.dataSync()[0];


    // Testing only (delete later)

    // const outputCanvas = document.createElement('CANVAS');
    // cv.imshow(outputCanvas, image);
    // document.body.appendChild(outputCanvas);

    // Cleanup
    image.delete();
    contours.delete();
    cnt.delete();
    hierarchy.delete();
    M.delete();
    X.dispose()
    result.dispose()

    return output;

}